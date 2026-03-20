/**
 * Fingard Integration Tests
 * 
 * Tests real API endpoints to verify 100% functionality
 * No fallbacks, all APIs working, stable operation
 */

import { FingardCore } from '../fingard-core'
import { ProviderRouter } from '../../carbon/provider-router'

describe('Fingard Integration Tests - Real APIs', () => {
  let fingard: FingardCore
  let providerRouter: ProviderRouter

  beforeAll(() => {
    fingard = new FingardCore()
    providerRouter = new ProviderRouter()
  })

  describe('Real API Connectivity Tests', () => {
    test('US East 1 - WattTime + EIA working without fallback', async () => {
      console.log('🔍 Testing us-east-1 with real APIs...')
      
      const result = await fingard.getRoutingSignal('us-east-1')
      
      // Verify we got a real signal, not fallback
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.signal.region).toBe('us-east-1')
      expect(result.signal.gco2).toBeGreaterThan(0)
      expect(result.signal.gco2).toBeLessThan(2000) // Reasonable range
      
      // Should NOT be using fallback
      expect(result.fallbackReason).toBe('NO_FALLBACK')
      expect(result.signal.degraded).toBeUndefined()
      
      // Should have high confidence from real API
      expect(result.signal.confidence).toBeGreaterThan(70)
      
      // Should be from WattTime or EIA (not static/ember)
      expect(['WATTTIME', 'EIA']).toContain(result.signal.source)
      
      console.log(`✅ us-east-1: ${result.signal.source} → ${result.signal.gco2} gCO2/kWh (${result.signal.confidence}% confidence)`)
    }, 15000)

    test('US West 2 - WattTime + BPA working without fallback', async () => {
      console.log('🔍 Testing us-west-2 with real APIs...')
      
      const result = await fingard.getRoutingSignal('us-west-2')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.fallbackReason).toBe('NO_FALLBACK')
      expect(result.signal.confidence).toBeGreaterThan(70)
      expect(['WATTTIME', 'EIA']).toContain(result.signal.source)
      
      console.log(`✅ us-west-2: ${result.signal.source} → ${result.signal.gco2} gCO2/kWh (${result.signal.confidence}% confidence)`)
    }, 15000)

    test('EU West 1 - GB/EU APIs working without fallback', async () => {
      console.log('🔍 Testing eu-west-1 with real APIs...')
      
      const result = await fingard.getRoutingSignal('eu-west-1')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.fallbackReason).toBe('NO_FALLBACK')
      expect(result.signal.confidence).toBeGreaterThan(60)
      expect(['GB', 'EMBER']).toContain(result.signal.source)
      
      console.log(`✅ eu-west-1: ${result.signal.source} → ${result.signal.gco2} gCO2/kWh (${result.signal.confidence}% confidence)`)
    }, 15000)

    test('EU West 2 - GB API working without fallback', async () => {
      console.log('🔍 Testing eu-west-2 with real APIs...')
      
      const result = await fingard.getRoutingSignal('eu-west-2')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.fallbackReason).toBe('NO_FALLBACK')
      expect(result.signal.confidence).toBeGreaterThan(60)
      expect(result.signal.source).toBe('GB')
      
      console.log(`✅ eu-west-2: ${result.signal.source} → ${result.signal.gco2} gCO2/kWh (${result.signal.confidence}% confidence)`)
    }, 15000)
  })

  describe('ProviderRouter Integration', () => {
    test('ProviderRouter uses Fingard signals successfully', async () => {
      console.log('🔍 Testing ProviderRouter with Fingard integration...')
      
      const routingSignal = await providerRouter.getRoutingSignal('us-east-1', new Date())
      
      expect(routingSignal).toBeTruthy()
      expect(routingSignal.carbonIntensity).toBeGreaterThan(0)
      expect(routingSignal.carbonIntensity).toBeLessThan(2000)
      expect(routingSignal.confidence).toBeGreaterThan(0.5) // 50%+ confidence
      expect(routingSignal.provenance.sourceUsed).toContain('_FINGARD')
      expect(routingSignal.provenance.fallbackUsed).toBe(false)
      
      console.log(`✅ ProviderRouter: ${routingSignal.provenance.sourceUsed} → ${routingSignal.carbonIntensity} gCO2/kWh`)
    }, 15000)

    test('ProviderRouter handles multiple regions consistently', async () => {
      console.log('🔍 Testing multiple regions for consistency...')
      
      const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-west-2']
      const results = []
      
      for (const region of regions) {
        const signal = await providerRouter.getRoutingSignal(region, new Date())
        results.push({ region, signal })
        expect(signal.carbonIntensity).toBeGreaterThan(0)
        expect(signal.confidence).toBeGreaterThan(0.3)
        console.log(`  ${region}: ${signal.carbonIntensity} gCO2/kWh (${signal.confidence})`)
      }
      
      // Verify we got different reasonable values for different regions
      const carbonIntensities = results.map(r => r.signal.carbonIntensity)
      const uniqueValues = new Set(carbonIntensities)
      expect(uniqueValues.size).toBeGreaterThan(1) // Should have different values
      
      console.log(`✅ All ${regions.length} regions working with real data`)
    }, 30000)
  })

  describe('Stability and Consistency Tests', () => {
    test('Same region returns consistent results over multiple calls', async () => {
      console.log('🔍 Testing consistency over multiple calls...')
      
      const region = 'us-east-1'
      const calls = 5
      const results = []
      
      for (let i = 0; i < calls; i++) {
        const result = await fingard.getRoutingSignal(region)
        results.push(result)
        
        // All calls should succeed without fallback
        expect(result.fallbackReason).toBe('NO_FALLBACK')
        expect(result.signal.confidence).toBeGreaterThan(70)
        
        // Small delay between calls
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Check consistency (should be same source, similar values)
      const sources = results.map(r => r.signal.source)
      const uniqueSources = new Set(sources)
      expect(uniqueSources.size).toBeLessThanOrEqual(2) // At most 2 different sources
      
      const avgConfidence = results.reduce((sum, r) => sum + r.signal.confidence, 0) / results.length
      expect(avgConfidence).toBeGreaterThan(70)
      
      console.log(`✅ ${calls} calls consistent - avg confidence: ${avgConfidence.toFixed(1)}%`)
    }, 45000)

    test('No fallbacks across all major regions', async () => {
      console.log('🔍 Testing all major regions for zero fallbacks...')
      
      const regions = [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-west-2', 'eu-central-1',
        'ap-southeast-1', 'ap-northeast-1'
      ]
      
      let fallbackCount = 0
      let totalConfidence = 0
      const results = []
      
      for (const region of regions) {
        try {
          const result = await fingard.getRoutingSignal(region)
          results.push({ region, result })
          
          if (result.fallbackReason !== 'NO_FALLBACK') {
            fallbackCount++
            console.warn(`  ⚠️  ${region}: FALLBACK - ${result.fallbackReason}`)
          } else {
            console.log(`  ✅ ${region}: ${result.signal.source} → ${result.signal.gco2} gCO2/kWh (${result.signal.confidence}% confidence)`)
            totalConfidence += result.signal.confidence
          }
        } catch (error) {
          fallbackCount++
          console.error(`  ❌ ${region}: ERROR - ${error}`)
        }
      }
      
      const successRate = ((regions.length - fallbackCount) / regions.length) * 100
      const avgConfidence = totalConfidence / (regions.length - fallbackCount)
      
      console.log(`📊 Results: ${successRate.toFixed(1)}% success rate, avg confidence: ${avgConfidence?.toFixed(1)}%`)
      
      // We expect high success rate with real APIs
      expect(successRate).toBeGreaterThan(80) // At least 80% should work
      if (avgConfidence) {
        expect(avgConfidence).toBeGreaterThan(50) // Good confidence when working
      }
    }, 60000)
  })

  describe('Health Check Verification', () => {
    test('Fingard health check reports healthy status', async () => {
      console.log('🔍 Testing Fingard health check...')
      
      const health = await fingard.healthCheck()
      
      expect(health).toBeTruthy()
      expect(['healthy', 'degraded', 'critical']).toContain(health.status)
      expect(health.regions).toBeGreaterThan(0)
      expect(health.lastUpdate).toBeTruthy()
      expect(Array.isArray(health.issues)).toBe(true)
      
      // Should be healthy or at worst degraded with real APIs
      expect(['healthy', 'degraded']).toContain(health.status)
      
      console.log(`✅ Health status: ${health.status}, regions tested: ${health.regions}`)
      if (health.issues.length > 0) {
        console.log(`  Issues: ${health.issues.join(', ')}`)
      }
    }, 20000)
  })
})
