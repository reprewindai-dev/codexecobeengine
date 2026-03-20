/**
 * Fingard Signal Normalization
 * 
 * Converts all provider signals to unified FingardSignal format
 * Ensures consistent shape across all data sources
 */

import { ProviderSignal } from '../carbon/provider-router'

export interface FingardSignal {
  region: string
  gco2: number
  source: 'WATTTIME' | 'EIA' | 'GB' | 'DK' | 'FI' | 'EMBER' | 'STATIC'
  confidence: number
  freshness: number
  degraded?: boolean
  metadata: Record<string, unknown>
}

/**
 * Normalize ProviderSignal to FingardSignal
 */
export function normalizeProviderSignal(
  providerSignal: ProviderSignal,
  region: string
): FingardSignal {
  const now = new Date()
  const signalTime = new Date(providerSignal.timestamp)
  const freshness = (now.getTime() - signalTime.getTime()) / (1000 * 60) // minutes

  // Map provider source to Fingard source
  const sourceMap: Record<string, FingardSignal['source']> = {
    'watttime': 'WATTTIME',
    'gridstatus_fuel_mix': 'EIA',
    'gb_carbon_intensity': 'GB',
    'dk_carbon': 'DK',
    'fi_carbon': 'FI',
    'ember': 'EMBER',
    'electricity_maps': 'EMBER', // Treat as Ember for now
    'fallback': 'STATIC'
  }

  const source = sourceMap[providerSignal.source] || 'STATIC'

  // Convert confidence from 0-1 to 0-100 scale
  const baseConfidence = (providerSignal.confidence || 0.5) * 100

  return {
    region,
    gco2: providerSignal.carbonIntensity,
    source,
    confidence: baseConfidence,
    freshness,
    metadata: {
      originalSource: providerSignal.source,
      isForecast: providerSignal.isForecast,
      estimatedFlag: providerSignal.estimatedFlag,
      syntheticFlag: providerSignal.syntheticFlag,
      ...providerSignal.metadata
    }
  }
}

/**
 * Create static degraded signal for fallback
 */
export function createStaticSignal(region: string, gco2: number = 450): FingardSignal {
  return {
    region,
    gco2,
    source: 'STATIC',
    confidence: 5, // Very low confidence for static
    freshness: 0, // Static signals are always "fresh"
    degraded: true,
    metadata: {
      fallbackReason: 'NO_VALID_SIGNAL',
      staticValue: true
    }
  }
}

/**
 * Create Ember baseline signal
 */
export function createEmberSignal(region: string, gco2: number): FingardSignal {
  return {
    region,
    gco2,
    source: 'EMBER',
    confidence: 25, // Low confidence for baseline
    freshness: 0, // Baseline is always current
    degraded: true,
    metadata: {
      fallbackReason: 'EMBER_BASELINE',
      baselineValue: true
    }
  }
}

/**
 * Validate signal meets minimum requirements
 */
export function validateSignal(signal: FingardSignal): boolean {
  // Basic validation
  if (!signal.region || signal.region.trim() === '') return false
  if (signal.gco2 < 0 || signal.gco2 > 2000) return false // Reasonable carbon intensity range
  if (signal.confidence < 0 || signal.confidence > 100) return false
  if (signal.freshness < 0) return false

  return true
}

/**
 * Apply source-specific validation rules
 */
export function applySourceValidation(signal: FingardSignal): FingardSignal {
  const validated = { ...signal }

  // Source-specific rules
  switch (signal.source) {
    case 'WATTTIME':
      // WattTime should be real-time or very recent
      if (signal.freshness > 60) { // 1 hour old
        validated.confidence *= 0.5 // Reduce confidence for old data
        validated.degraded = true
      }
      break

    case 'EIA':
      // EIA fuel mix data updates hourly
      if (signal.freshness > 120) { // 2 hours old
        validated.confidence *= 0.7
        validated.degraded = true
      }
      break

    case 'GB':
    case 'DK':
    case 'FI':
      // EU APIs should be relatively fresh
      if (signal.freshness > 180) { // 3 hours old
        validated.confidence *= 0.6
        validated.degraded = true
      }
      break

    case 'EMBER':
      // Ember baseline is always valid but low confidence
      break

    case 'STATIC':
      // Static fallback is always degraded
      validated.degraded = true
      break
  }

  return validated
}
