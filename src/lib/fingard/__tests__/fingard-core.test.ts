/**
 * Fingard Core Tests
 * 
 * Basic tests to verify Fingard layer functionality
 */

import { FingardCore } from '../fingard-core'
import { getRegionMapping, getRegionGroup } from '../region-mapping'

describe('Fingard Core', () => {
  let fingard: FingardCore

  beforeAll(() => {
    fingard = new FingardCore()
  })

  describe('Region Mapping', () => {
    test('should correctly identify US regions', () => {
      expect(getRegionGroup('us-east-1')).toBe('US')
      expect(getRegionGroup('us-west-2')).toBe('US')
    })

    test('should correctly identify EU regions', () => {
      expect(getRegionGroup('eu-west-1')).toBe('EU')
      expect(getRegionGroup('eu-west-2')).toBe('EU')
    })

    test('should correctly identify GLOBAL regions', () => {
      expect(getRegionGroup('ap-southeast-1')).toBe('GLOBAL')
      expect(getRegionGroup('unknown-region')).toBe('GLOBAL')
    })

    test('should return mapping for known regions', () => {
      const mapping = getRegionMapping('us-east-1')
      expect(mapping).toBeTruthy()
      expect(mapping?.group).toBe('US')
      expect(mapping?.watttime).toBe('PJM_DC')
    })
  })

  describe('Signal Selection', () => {
    test('should return a valid signal for US region', async () => {
      const result = await fingard.getRoutingSignal('us-east-1')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.signal.region).toBe('us-east-1')
      expect(result.signal.gco2).toBeGreaterThan(0)
      expect(result.signal.confidence).toBeGreaterThanOrEqual(0)
      expect(result.signal.source).toBeTruthy()
    }, 10000)

    test('should return a valid signal for EU region', async () => {
      const result = await fingard.getRoutingSignal('eu-west-1')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.signal.region).toBe('eu-west-1')
      expect(result.signal.gco2).toBeGreaterThan(0)
      expect(result.signal.confidence).toBeGreaterThanOrEqual(0)
    }, 10000)

    test('should return a valid signal for GLOBAL region', async () => {
      const result = await fingard.getRoutingSignal('ap-southeast-1')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.signal.region).toBe('ap-southeast-1')
      expect(result.signal.gco2).toBeGreaterThan(0)
      expect(result.signal.confidence).toBeGreaterThanOrEqual(0)
    }, 10000)

    test('should handle unknown regions gracefully', async () => {
      const result = await fingard.getRoutingSignal('unknown-region')
      
      expect(result).toBeTruthy()
      expect(result.signal).toBeTruthy()
      expect(result.signal.region).toBe('unknown-region')
      expect(result.signal.gco2).toBeGreaterThan(0)
      // Should fallback to static for unknown regions
      expect(result.signal.source).toBe('STATIC')
      expect(result.fallbackReason).toBeTruthy()
    }, 10000)
  })

  describe('Health Check', () => {
    test('should return health status', async () => {
      const health = await fingard.healthCheck()
      
      expect(health).toBeTruthy()
      expect(health.status).toMatch(/^(healthy|degraded|critical)$/)
      expect(health.regions).toBeGreaterThan(0)
      expect(health.lastUpdate).toBeTruthy()
      expect(Array.isArray(health.issues)).toBe(true)
    }, 15000)
  })

  describe('Fallback Protection', () => {
    test('should never return null signals', async () => {
      // Test multiple regions to ensure no null returns
      const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'invalid-region']
      
      for (const region of regions) {
        const result = await fingard.getRoutingSignal(region)
        expect(result).toBeTruthy()
        expect(result.signal).toBeTruthy()
        expect(result.signal.gco2).toBeGreaterThan(0)
      }
    }, 20000)

    test('should provide fallback reasons when needed', async () => {
      const result = await fingard.getRoutingSignal('completely-fake-region')
      
      expect(result.fallbackReason).toBeTruthy()
      expect(result.fallbackReason).not.toBe('NO_FALLBACK')
      expect(result.signal.degraded).toBe(true)
    }, 10000)
  })
})
