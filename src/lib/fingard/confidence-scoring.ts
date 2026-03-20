/**
 * Fingard Confidence Scoring
 * 
 * Applies source-specific confidence decay and scoring
 * Uses per-source freshness penalties based on update frequency
 */

import { FingardSignal } from './normalization'

/**
 * Source-specific decay rates
 * Higher values = faster confidence decay with age
 */
const CONFIDENCE_DECAY: Record<FingardSignal['source'], number> = {
  'WATTTIME': 1.0,    // Real-time data, decays fast
  'EIA': 0.2,         // Hourly updates, slower decay
  'GB': 0.2,          // Hourly updates, slower decay  
  'DK': 0.2,          // Hourly updates, slower decay
  'FI': 0.2,          // 3-min updates, but conservative decay
  'EMBER': 0.02,      // Baseline data, very slow decay
  'STATIC': 0.0,      // Static fallback, no decay
}

/**
 * Source-specific base confidence scores
 */
const BASE_CONFIDENCE: Record<FingardSignal['source'], number> = {
  'WATTTIME': 90,     // High confidence in real-time marginal data
  'EIA': 80,          // Good confidence in measured fuel mix
  'GB': 75,           // Good confidence in official GB data
  'DK': 75,           // Good confidence in official DK data
  'FI': 75,           // Good confidence in official FI data
  'EMBER': 25,        // Low confidence in historical baseline
  'STATIC': 5,        // Very low confidence in static fallback
}

/**
 * Calculate confidence score with freshness penalty
 */
export function calculateConfidence(signal: FingardSignal): number {
  const baseConfidence = BASE_CONFIDENCE[signal.source]
  const decayRate = CONFIDENCE_DECAY[signal.source]
  
  // Apply freshness penalty
  const freshnessPenalty = signal.freshness * decayRate
  const adjustedConfidence = Math.max(0, baseConfidence - freshnessPenalty)
  
  // Cap at 100
  return Math.min(100, adjustedConfidence)
}

/**
 * Apply confidence scoring to signal
 */
export function applyConfidenceScoring(signal: FingardSignal): FingardSignal {
  const scored = { ...signal }
  scored.confidence = calculateConfidence(signal)
  
  // Mark as degraded if confidence falls below threshold
  if (scored.confidence < 50) {
    scored.degraded = true
  }
  
  return scored
}

/**
 * Compare two signals by confidence (for sorting)
 */
export function compareByConfidence(a: FingardSignal, b: FingardSignal): number {
  // Primary sort: confidence (highest first)
  if (a.confidence !== b.confidence) {
    return b.confidence - a.confidence
  }
  
  // Secondary sort: freshness (lowest first)
  if (a.freshness !== b.freshness) {
    return a.freshness - b.freshness
  }
  
  // Tertiary sort: source priority
  const sourcePriority: Record<FingardSignal['source'], number> = {
    'WATTTIME': 1,
    'EIA': 2,
    'GB': 3,
    'DK': 4,
    'FI': 5,
    'EMBER': 6,
    'STATIC': 7,
  }
  
  return sourcePriority[a.source] - sourcePriority[b.source]
}

/**
 * Check if signal meets minimum confidence threshold
 */
export function meetsMinimumConfidence(signal: FingardSignal, threshold: number = 50): boolean {
  return signal.confidence >= threshold
}

/**
 * Get confidence level category
 */
export function getConfidenceLevel(signal: FingardSignal): 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' {
  if (signal.confidence >= 80) return 'HIGH'
  if (signal.confidence >= 60) return 'MEDIUM'
  if (signal.confidence >= 40) return 'LOW'
  return 'CRITICAL'
}
