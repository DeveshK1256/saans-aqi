/**
 * Saans National Air Quality Index (NAQI) Engine
 * Implements the official Central Pollution Control Board (CPCB) NAQI formula.
 * Source: Ministry of Environment, Forest and Climate Change (MoEFCC), 2014 notification.
 *
 * Requirements:
 * - Linear interpolation across breakpoint bands
 * - Overall NAQI is the maximum sub-index
 * - Minimum 3 pollutants with at least one particulate (PM2.5 or PM10) required, else marked 'partial'
 */

import { NaqiCategory, NaqiResult, NaqiSubIndex, PollutantValues } from './types';

export interface Breakpoint {
  bLow: number;
  bHigh: number;
  iLow: number;
  iHigh: number;
  category: NaqiCategory;
  colorHex: string;
}

// CPCB Breakpoints for all 6 criteria pollutants
export const NAQI_BREAKPOINTS: Record<keyof PollutantValues, Breakpoint[]> = {
  pm25: [
    { bLow: 0,   bHigh: 30,  iLow: 0,   iHigh: 50,  category: 'Good',         colorHex: '#009966' },
    { bLow: 31,  bHigh: 60,  iLow: 51,  iHigh: 100, category: 'Satisfactory', colorHex: '#58B453' },
    { bLow: 61,  bHigh: 90,  iLow: 101, iHigh: 200, category: 'Moderate',     colorHex: '#FFDD44' },
    { bLow: 91,  bHigh: 120, iLow: 201, iHigh: 300, category: 'Poor',         colorHex: '#FF8800' },
    { bLow: 121, bHigh: 250, iLow: 301, iHigh: 400, category: 'Very Poor',    colorHex: '#CC0033' },
    { bLow: 251, bHigh: 500, iLow: 401, iHigh: 500, category: 'Severe',       colorHex: '#660099' },
  ],
  pm10: [
    { bLow: 0,   bHigh: 50,  iLow: 0,   iHigh: 50,  category: 'Good',         colorHex: '#009966' },
    { bLow: 51,  bHigh: 100, iLow: 51,  iHigh: 100, category: 'Satisfactory', colorHex: '#58B453' },
    { bLow: 101, bHigh: 250, iLow: 101, iHigh: 200, category: 'Moderate',     colorHex: '#FFDD44' },
    { bLow: 251, bHigh: 350, iLow: 201, iHigh: 300, category: 'Poor',         colorHex: '#FF8800' },
    { bLow: 351, bHigh: 430, iLow: 301, iHigh: 400, category: 'Very Poor',    colorHex: '#CC0033' },
    { bLow: 431, bHigh: 500, iLow: 401, iHigh: 500, category: 'Severe',       colorHex: '#660099' },
  ],
  no2: [
    { bLow: 0,   bHigh: 40,  iLow: 0,   iHigh: 50,  category: 'Good',         colorHex: '#009966' },
    { bLow: 41,  bHigh: 80,  iLow: 51,  iHigh: 100, category: 'Satisfactory', colorHex: '#58B453' },
    { bLow: 81,  bHigh: 180, iLow: 101, iHigh: 200, category: 'Moderate',     colorHex: '#FFDD44' },
    { bLow: 181, bHigh: 280, iLow: 201, iHigh: 300, category: 'Poor',         colorHex: '#FF8800' },
    { bLow: 281, bHigh: 400, iLow: 301, iHigh: 400, category: 'Very Poor',    colorHex: '#CC0033' },
    { bLow: 401, bHigh: 500, iLow: 401, iHigh: 500, category: 'Severe',       colorHex: '#660099' },
  ],
  o3: [
    { bLow: 0,   bHigh: 50,  iLow: 0,   iHigh: 50,  category: 'Good',         colorHex: '#009966' },
    { bLow: 51,  bHigh: 100, iLow: 51,  iHigh: 100, category: 'Satisfactory', colorHex: '#58B453' },
    { bLow: 101, bHigh: 168, iLow: 101, iHigh: 200, category: 'Moderate',     colorHex: '#FFDD44' },
    { bLow: 169, bHigh: 208, iLow: 201, iHigh: 300, category: 'Poor',         colorHex: '#FF8800' },
    { bLow: 209, bHigh: 748, iLow: 301, iHigh: 400, category: 'Very Poor',    colorHex: '#CC0033' },
    { bLow: 749, bHigh: 1000, iLow: 401, iHigh: 500, category: 'Severe',      colorHex: '#660099' },
  ],
  co: [
    { bLow: 0.0,  bHigh: 1.0,  iLow: 0,   iHigh: 50,  category: 'Good',         colorHex: '#009966' },
    { bLow: 1.1,  bHigh: 2.0,  iLow: 51,  iHigh: 100, category: 'Satisfactory', colorHex: '#58B453' },
    { bLow: 2.1,  bHigh: 10.0, iLow: 101, iHigh: 200, category: 'Moderate',     colorHex: '#FFDD44' },
    { bLow: 10.1, bHigh: 17.0, iLow: 201, iHigh: 300, category: 'Poor',         colorHex: '#FF8800' },
    { bLow: 17.1, bHigh: 34.0, iLow: 301, iHigh: 400, category: 'Very Poor',    colorHex: '#CC0033' },
    { bLow: 34.1, bHigh: 50.0, iLow: 401, iHigh: 500, category: 'Severe',       colorHex: '#660099' },
  ],
  so2: [
    { bLow: 0,   bHigh: 40,   iLow: 0,   iHigh: 50,  category: 'Good',         colorHex: '#009966' },
    { bLow: 41,  bHigh: 80,   iLow: 51,  iHigh: 100, category: 'Satisfactory', colorHex: '#58B453' },
    { bLow: 81,  bHigh: 380,  iLow: 101, iHigh: 200, category: 'Moderate',     colorHex: '#FFDD44' },
    { bLow: 381, bHigh: 800,  iLow: 201, iHigh: 300, category: 'Poor',         colorHex: '#FF8800' },
    { bLow: 801, bHigh: 1600, iLow: 301, iHigh: 400, category: 'Very Poor',    colorHex: '#CC0033' },
    { bLow: 1601, bHigh: 2000, iLow: 401, iHigh: 500, category: 'Severe',     colorHex: '#660099' },
  ],
};

export const NAQI_COLORS: Record<NaqiCategory, string> = {
  Good: '#009966',
  Satisfactory: '#58B453',
  Moderate: '#FFDD44',
  Poor: '#FF8800',
  'Very Poor': '#CC0033',
  Severe: '#660099',
};

/**
 * Calculates sub-index for an individual pollutant concentration.
 */
export function calculateSubIndex(pollutant: keyof PollutantValues, concentration: number): NaqiSubIndex {
  if (concentration < 0) {
    throw new Error(`Concentration cannot be negative: ${concentration}`);
  }

  const table = NAQI_BREAKPOINTS[pollutant];
  if (!table) {
    throw new Error(`No breakpoints defined for pollutant: ${pollutant}`);
  }

  // Handle upper bound saturation
  const maxBp = table[table.length - 1];
  if (concentration >= maxBp.bHigh) {
    return {
      pollutant,
      concentration,
      subIndex: 500,
      category: 'Severe',
    };
  }

  for (const bp of table) {
    if (concentration >= bp.bLow && concentration <= bp.bHigh) {
      const subIndex = Math.round(
        ((bp.iHigh - bp.iLow) / (bp.bHigh - bp.bLow)) * (concentration - bp.bLow) + bp.iLow
      );
      return {
        pollutant,
        concentration,
        subIndex: Math.min(500, Math.max(0, subIndex)),
        category: bp.category,
      };
    }
  }

  // Fallback to highest band
  return {
    pollutant,
    concentration,
    subIndex: 500,
    category: 'Severe',
  };
}

/**
 * Computes overall National Air Quality Index (NAQI) across available pollutants.
 */
export function computeNaqi(pollutants: PollutantValues): NaqiResult {
  const subIndices: NaqiSubIndex[] = [];

  const keys: (keyof PollutantValues)[] = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
  for (const key of keys) {
    const val = pollutants[key];
    if (typeof val === 'number' && !isNaN(val)) {
      subIndices.push(calculateSubIndex(key, val));
    }
  }

  if (subIndices.length === 0) {
    throw new Error('At least one pollutant measurement must be provided');
  }

  // Sort descending by sub-index
  subIndices.sort((a, b) => b.subIndex - a.subIndex);

  const dominant = subIndices[0];
  const hasParticulate = subIndices.some((s) => s.pollutant === 'pm25' || s.pollutant === 'pm10');
  const isPartial = subIndices.length < 3 || !hasParticulate;

  return {
    overallAqi: dominant.subIndex,
    dominantPollutant: dominant.pollutant,
    category: dominant.category,
    colorHex: NAQI_COLORS[dominant.category],
    isPartial,
    subIndices,
  };
}
