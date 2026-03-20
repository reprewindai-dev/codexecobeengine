/**
 * Fingard Fallback Engine
 * 
 * Handles hard fail protection and degraded signal generation
 * Ensures no routing signal leaves Fingard as null/undefined
 */

import { FingardSignal, createStaticSignal, createEmberSignal } from './normalization'
import { getRegionMapping, getRegionGroup } from './region-mapping'

export interface FallbackResult {
  signal: FingardSignal
  fallbackReason: string
  originalError?: string
}

/**
 * Generate fallback signal when no valid signal is available
 * Uses region-specific strategy: US → EU → GLOBAL
 */
export function generateFallbackSignal(region: string, originalError?: string): FallbackResult {
  const regionGroup = getRegionGroup(region)
  const mapping = getRegionMapping(region)
  
  // Try Ember baseline first (better than static)
  if (mapping?.ember) {
    // Use reasonable Ember baseline values by region group
    const emberBaseline = getEmberBaselineForRegion(regionGroup)
    const emberSignal = createEmberSignal(region, emberBaseline)
    
    return {
      signal: emberSignal,
      fallbackReason: 'EMBER_BASELINE_FALLBACK',
      originalError
    }
  }
  
  // Final fallback to static
  const staticSignal = createStaticSignal(region, 450)
  
  return {
    signal: staticSignal,
    fallbackReason: 'STATIC_FALLBACK',
    originalError
  }
}

/**
 * Get Ember baseline carbon intensity by region group
 */
function getEmberBaselineForRegion(regionGroup: 'US' | 'EU' | 'GLOBAL'): number {
  const baselines: Record<'US' | 'EU' | 'GLOBAL', number> = {
    'US': 400,   // US grid average
    'EU': 300,   // EU grid average  
    'GLOBAL': 450 // Global average
  }
  
  return baselines[regionGroup] || 450
}

/**
 * Apply hard fail protection to signal
 * Returns degraded signal if confidence too low
 */
export function applyHardFailProtection(
  signal: FingardSignal,
  minConfidence: number = 50
): FallbackResult | null {
  // If signal meets minimum confidence, return null (no fallback needed)
  if (signal.confidence >= minConfidence && !signal.degraded) {
    return null
  }
  
  // Signal needs fallback
  let fallbackReason: string
  
  if (signal.confidence < minConfidence) {
    fallbackReason = 'LOW_CONFIDENCE_FALLBACK'
  } else if (signal.degraded) {
    fallbackReason = 'DEGRADED_SIGNAL_FALLBACK'
  } else {
    fallbackReason = 'HARD_FAIL_PROTECTION'
  }
  
  const fallback = generateFallbackSignal(signal.region, fallbackReason)
  
  return {
    ...fallback,
    fallbackReason
  }
}

/**
 * Validate signal and apply fallback if needed
 */
export function validateWithFallback(
  signal: FingardSignal | null,
  region: string,
  error?: string
): FallbackResult {
  // If no signal, generate fallback
  if (!signal) {
    return generateFallbackSignal(region, error || 'NO_SIGNAL_AVAILABLE')
  }
  
  // Apply hard fail protection
  const hardFailResult = applyHardFailProtection(signal)
  if (hardFailResult) {
    return hardFailResult
  }
  
  // Signal is valid, return as successful result
  return {
    signal,
    fallbackReason: 'NO_FALLBACK'
  }
}

/**
 * Create degraded signal for specific scenarios
 */
export function createDegradedSignal(
  region: string,
  reason: string,
  baseSignal?: FingardSignal
): FallbackResult {
  if (baseSignal) {
    // Degrade existing signal
    const degraded = { ...baseSignal }
    degraded.degraded = true
    degraded.confidence *= 0.5 // Reduce confidence by half
    
    return {
      signal: degraded,
      fallbackReason: reason
    }
  }
  
  // Create new degraded signal
  return generateFallbackSignal(region, reason)
}

/**
 * Check if fallback result represents actual fallback
 */
export function isActualFallback(result: FallbackResult): boolean {
  return result.fallbackReason !== 'NO_FALLBACK'
}

/**
 * Log fallback decisions for monitoring
 */
export function logFallbackDecision(result: FallbackResult, region: string): void {
  if (isActualFallback(result)) {
    console.warn(`Fingard fallback activated for ${region}:`, {
      reason: result.fallbackReason,
      signal: {
        source: result.signal.source,
        confidence: result.signal.confidence,
        gco2: result.signal.gco2,
        degraded: result.signal.degraded
      },
      originalError: result.originalError
    })
  }
}
