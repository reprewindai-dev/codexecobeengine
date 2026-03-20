/**
 * Fingard Region Mapping
 * 
 * Unified mapping for cloud regions → provider-specific regions
 * Consolidates multiple existing maps into single source of truth
 */

export interface RegionMapping {
  cloudRegion: string
  group: 'US' | 'EU' | 'GLOBAL'
  watttime?: string
  eia?: string
  gb?: string
  dk?: string
  fi?: string
  ember?: string
  notes?: string
}

/**
 * Unified region mapping for all providers
 * Priority: US → EU → GLOBAL routing strategies
 */
export const FINGARD_REGION_MAP: Record<string, RegionMapping> = {
  // ── AWS US Regions ──
  'us-east-1': {
    cloudRegion: 'us-east-1',
    group: 'US',
    watttime: 'PJM_DC',
    eia: 'PJM',
    ember: 'US-MIDA-PJM',
    notes: 'Northern Virginia, PJM territory'
  },
  'us-east-2': {
    cloudRegion: 'us-east-2',
    group: 'US',
    watttime: 'PJM_ROANOKE',
    eia: 'PJM',
    ember: 'US-MIDA-PJM',
    notes: 'Ohio, PJM territory'
  },
  'us-west-1': {
    cloudRegion: 'us-west-1',
    group: 'US',
    watttime: 'CAISO_NORTH',
    eia: 'CISO',
    ember: 'US-CAL-CISO',
    notes: 'Northern California, CAISO'
  },
  'us-west-2': {
    cloudRegion: 'us-west-2',
    group: 'US',
    watttime: 'BPA',
    eia: 'BPA',
    ember: 'US-NW-BPAT',
    notes: 'Oregon, Bonneville Power'
  },
  'us-central1': {
    cloudRegion: 'us-central1',
    group: 'US',
    watttime: 'MISO_MI',
    eia: 'MISO',
    ember: 'US-MIDW-MISO',
    notes: 'Iowa, MISO'
  },

  // ── AWS EU Regions ──
  'eu-west-1': {
    cloudRegion: 'eu-west-1',
    group: 'EU',
    ember: 'IE',
    notes: 'Ireland'
  },
  'eu-west-2': {
    cloudRegion: 'eu-west-2',
    group: 'EU',
    gb: 'GB',
    ember: 'GB',
    notes: 'London'
  },
  'eu-central-1': {
    cloudRegion: 'eu-central-1',
    group: 'EU',
    ember: 'DE',
    notes: 'Frankfurt'
  },

  // ── AWS Other Regions ──
  'ap-southeast-1': {
    cloudRegion: 'ap-southeast-1',
    group: 'GLOBAL',
    ember: 'SG',
    notes: 'Singapore'
  },
  'ap-northeast-1': {
    cloudRegion: 'ap-northeast-1',
    group: 'GLOBAL',
    ember: 'JP-TK',
    notes: 'Tokyo'
  },
  'ap-south-1': {
    cloudRegion: 'ap-south-1',
    group: 'GLOBAL',
    ember: 'IN-WE',
    notes: 'Mumbai'
  },
  'ca-central-1': {
    cloudRegion: 'ca-central-1',
    group: 'EU',
    ember: 'CA-ON',
    notes: 'Canada Central'
  },
  'sa-east-1': {
    cloudRegion: 'sa-east-1',
    group: 'GLOBAL',
    ember: 'BR-CS',
    notes: 'São Paulo'
  },

  // ── GCP Regions ──
  'us-east4': {
    cloudRegion: 'us-east4',
    group: 'US',
    watttime: 'PJM_DC',
    eia: 'PJM',
    ember: 'US-MIDA-PJM',
    notes: 'GCP N. Virginia'
  },
  'us-west1': {
    cloudRegion: 'us-west1',
    group: 'US',
    watttime: 'BPA',
    eia: 'BPA',
    ember: 'US-NW-BPAT',
    notes: 'GCP Oregon'
  },
  'us-central1-gcp': {
    cloudRegion: 'us-central1-gcp',
    group: 'US',
    watttime: 'MISO_MI',
    eia: 'MISO',
    ember: 'US-MIDW-MISO',
    notes: 'GCP Iowa'
  },
  'europe-west1': {
    cloudRegion: 'europe-west1',
    group: 'EU',
    ember: 'BE',
    notes: 'GCP Belgium'
  },
  'europe-west2': {
    cloudRegion: 'europe-west2',
    group: 'EU',
    gb: 'GB',
    ember: 'GB',
    notes: 'GCP London'
  },

  // ── Azure Regions ──
  'eastus': {
    cloudRegion: 'eastus',
    group: 'US',
    watttime: 'PJM_DC',
    eia: 'PJM',
    ember: 'US-MIDA-PJM',
    notes: 'Azure Virginia'
  },
  'eastus2': {
    cloudRegion: 'eastus2',
    group: 'US',
    watttime: 'PJM_DC',
    eia: 'PJM',
    ember: 'US-MIDA-PJM',
    notes: 'Azure Virginia'
  },
  'westus2': {
    cloudRegion: 'westus2',
    group: 'US',
    watttime: 'BPA',
    eia: 'BPA',
    ember: 'US-NW-BPAT',
    notes: 'Azure Washington'
  },
  'centralus': {
    cloudRegion: 'centralus',
    group: 'US',
    watttime: 'SPP_NORTH',
    eia: 'SPP',
    ember: 'US-MIDW-MISO',
    notes: 'Azure Iowa'
  },
  'southcentralus': {
    cloudRegion: 'southcentralus',
    group: 'US',
    watttime: 'ERCOT_SOUTH',
    eia: 'ERCO',
    ember: 'US-TEX-ERCO',
    notes: 'Azure Texas'
  },
  'uksouth': {
    cloudRegion: 'uksouth',
    group: 'EU',
    gb: 'GB',
    ember: 'GB',
    notes: 'Azure UK South'
  },
  'northeurope': {
    cloudRegion: 'northeurope',
    group: 'EU',
    ember: 'IE',
    notes: 'Azure Ireland'
  },
  'westeurope': {
    cloudRegion: 'westeurope',
    group: 'EU',
    ember: 'NL',
    notes: 'Azure Netherlands'
  }
}

/**
 * Get region mapping for a cloud region
 */
export function getRegionMapping(cloudRegion: string): RegionMapping | null {
  return FINGARD_REGION_MAP[cloudRegion] || null
}

/**
 * Get region group (US/EU/GLOBAL) for routing strategy
 */
export function getRegionGroup(cloudRegion: string): 'US' | 'EU' | 'GLOBAL' {
  const mapping = getRegionMapping(cloudRegion)
  return mapping?.group || 'GLOBAL'
}

/**
 * Check if region has US-specific routing (WattTime + EIA)
 */
export function isUSRegion(cloudRegion: string): boolean {
  return getRegionGroup(cloudRegion) === 'US'
}

/**
 * Check if region has EU-specific routing (GB/DK/FI direct APIs)
 */
export function isEURegion(cloudRegion: string): boolean {
  return getRegionGroup(cloudRegion) === 'EU'
}

/**
 * Get all mapped regions
 */
export function getAllMappedRegions(): string[] {
  return Object.keys(FINGARD_REGION_MAP)
}
