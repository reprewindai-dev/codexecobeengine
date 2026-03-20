/**
 * Fingard Core
 * 
 * Main control layer that sits between providers and ECOBE routing engine
 * Implements region-specific routing strategies and signal selection
 */

import { ProviderRouter } from '../carbon/provider-router'
import { ProviderSignal } from '../carbon/provider-router'
import { 
  FingardSignal, 
  normalizeProviderSignal, 
  validateSignal 
} from './normalization'
import { 
  applyConfidenceScoring, 
  compareByConfidence, 
  meetsMinimumConfidence 
} from './confidence-scoring'
import { 
  validateWithFallback, 
  logFallbackDecision,
  FallbackResult 
} from './fallback-engine'
import { 
  getRegionMapping, 
  getRegionGroup, 
  isUSRegion, 
  isEURegion 
} from './region-mapping'

export class FingardCore {
  private providerRouter: ProviderRouter

  constructor() {
    this.providerRouter = new ProviderRouter({ useFingard: false })
  }

  /**
   * Select best signal for a region using region-specific strategy
   * US: WattTime → EIA → Ember → Static
   * EU: GB/DK/FI → Ember → Static  
   * Global: Ember → Static
   */
  async selectBestSignal(region: string, timestamp: Date = new Date()): Promise<FallbackResult> {
    try {
      const regionGroup = getRegionGroup(region)
      
      // Use region-specific strategy
      switch (regionGroup) {
        case 'US':
          return await this.selectUSSignal(region, timestamp)
        case 'EU':
          return await this.selectEUSignal(region, timestamp)
        case 'GLOBAL':
          return await this.selectGlobalSignal(region, timestamp)
        default:
          return validateWithFallback(null, region, 'UNKNOWN_REGION_GROUP')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      return validateWithFallback(null, region, errorMessage)
    }
  }

  /**
   * US Region Strategy: WattTime → EIA → Ember → Static
   */
  private async selectUSSignal(region: string, timestamp: Date): Promise<FallbackResult> {
    const candidates: FingardSignal[] = []

    // 1. Try WattTime MOER (highest priority for US)
    const watttimeSignal = await this.getProviderSignal('watttime', region, timestamp)
    if (watttimeSignal) {
      candidates.push(watttimeSignal)
    }

    // 2. Try EIA fuel mix (US backbone)
    const eiaSignal = await this.getProviderSignal('eia', region, timestamp)
    if (eiaSignal) {
      candidates.push(eiaSignal)
    }

    // 3. Try Ember baseline
    const emberSignal = await this.getProviderSignal('ember', region, timestamp)
    if (emberSignal) {
      candidates.push(emberSignal)
    }

    // Select best candidate
    const bestSignal = this.selectBestCandidate(candidates)
    const result = validateWithFallback(bestSignal, region)

    logFallbackDecision(result, region)
    return result
  }

  /**
   * EU Region Strategy: GB/DK/FI direct APIs → Ember → Static
   */
  private async selectEUSignal(region: string, timestamp: Date): Promise<FallbackResult> {
    const candidates: FingardSignal[] = []

    // 1. Try EU direct APIs based on region
    const euDirectSignal = await this.getEUDirectSignal(region, timestamp)
    if (euDirectSignal) {
      candidates.push(euDirectSignal)
    }

    // 2. Try Ember baseline
    const emberSignal = await this.getProviderSignal('ember', region, timestamp)
    if (emberSignal) {
      candidates.push(emberSignal)
    }

    // Select best candidate
    const bestSignal = this.selectBestCandidate(candidates)
    const result = validateWithFallback(bestSignal, region)

    logFallbackDecision(result, region)
    return result
  }

  /**
   * Global Region Strategy: Ember → Static
   */
  private async selectGlobalSignal(region: string, timestamp: Date): Promise<FallbackResult> {
    const candidates: FingardSignal[] = []

    // 1. Try Ember baseline (primary for global regions)
    const emberSignal = await this.getProviderSignal('ember', region, timestamp)
    if (emberSignal) {
      candidates.push(emberSignal)
    }

    // Select best candidate (likely just Ember, or fallback)
    const bestSignal = this.selectBestCandidate(candidates)
    const result = validateWithFallback(bestSignal, region)

    logFallbackDecision(result, region)
    return result
  }

  /**
   * Get signal from specific provider
   */
  private async getProviderSignal(
    provider: string, 
    region: string, 
    timestamp: Date
  ): Promise<FingardSignal | null> {
    try {
      // Get signal from existing ProviderRouter
      const routingSignal = await this.providerRouter.getRoutingSignal(region, timestamp)
      
      // Convert ProviderSignal to FingardSignal
      const providerSignal: ProviderSignal = {
        carbonIntensity: routingSignal.carbonIntensity,
        isForecast: routingSignal.isForecast,
        source: routingSignal.source,
        timestamp: routingSignal.provenance.referenceTime,
        estimatedFlag: false,
        syntheticFlag: routingSignal.provenance.fallbackUsed,
        confidence: routingSignal.confidence,
        metadata: routingSignal.provenance
      }

      // Normalize to Fingard format
      let fingardSignal = normalizeProviderSignal(providerSignal, region)
      
      // Validate signal
      if (!validateSignal(fingardSignal)) {
        return null
      }

      // Apply confidence scoring
      fingardSignal = applyConfidenceScoring(fingardSignal)

      return fingardSignal
    } catch (error) {
      console.warn(`Failed to get ${provider} signal for ${region}:`, error)
      return null
    }
  }

  /**
   * Get EU direct signal based on region
   */
  private async getEUDirectSignal(region: string, timestamp: Date): Promise<FingardSignal | null> {
    const mapping = getRegionMapping(region)
    
    // Try region-specific EU APIs
    if (mapping?.gb) {
      return await this.getProviderSignal('gb_carbon_intensity', region, timestamp)
    }
    if (mapping?.dk) {
      return await this.getProviderSignal('dk_carbon', region, timestamp)
    }
    if (mapping?.fi) {
      return await this.getProviderSignal('fi_carbon', region, timestamp)
    }

    return null
  }

  /**
   * Select best candidate from available signals
   */
  private selectBestCandidate(candidates: FingardSignal[]): FingardSignal | null {
    if (candidates.length === 0) {
      return null
    }

    if (candidates.length === 1) {
      return candidates[0]
    }

    // Sort by confidence, freshness, and source priority
    candidates.sort(compareByConfidence)

    // Return the best candidate
    return candidates[0]
  }

  /**
   * Get routing signal with Fingard protection
   * This is the main entry point for the ECOBE engine
   */
  async getRoutingSignal(region: string, timestamp: Date = new Date()): Promise<FallbackResult> {
    return await this.selectBestSignal(region, timestamp)
  }

  /**
   * Health check for Fingard system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    regions: number
    lastUpdate: string
    issues: string[]
  }> {
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'] // Test key regions
    const results = await Promise.allSettled(
      regions.map(region => this.selectBestSignal(region))
    )

    const issues: string[] = []
    let healthyCount = 0

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const fallbackResult = result.value
        if (!fallbackResult.signal.degraded) {
          healthyCount++
        } else {
          issues.push(`${regions[index]}: ${fallbackResult.fallbackReason}`)
        }
      } else {
        issues.push(`${regions[index]}: ${result.reason}`)
      }
    })

    const status = healthyCount === regions.length ? 'healthy' : 
                   healthyCount > 0 ? 'degraded' : 'critical'

    return {
      status,
      regions: regions.length,
      lastUpdate: new Date().toISOString(),
      issues
    }
  }
}
