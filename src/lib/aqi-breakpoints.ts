/**
 * Saans AQI Breakpoint Converter
 * Converts PM2.5 concentration to India National AQI and US EPA AQI.
 *
 * License: MIT (see /LICENSE)
 * Source: CPCB National Air Quality Index, 2014
 *         US EPA AQI Technical Assistance Document, 2024
 */

export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
export type AqiCategoryUS = 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';

export interface AqiResult {
  value: number;
  category: AqiCategory | AqiCategoryUS;
  colorHex: string;
}

// --- India CPCB AQI Breakpoints for PM2.5 (24-hour average, µg/m³) ---
// Source: CPCB National Air Quality Index notification, 2014
const INDIA_PM25_BREAKPOINTS: Array<{
  cLow: number; cHigh: number; iLow: number; iHigh: number;
  category: AqiCategory; color: string;
}> = [
  { cLow: 0,   cHigh: 30,  iLow: 0,   iHigh: 50,  category: 'Good',         color: '#009966' },
  { cLow: 31,  cHigh: 60,  iLow: 51,  iHigh: 100, category: 'Satisfactory', color: '#58B453' },
  { cLow: 61,  cHigh: 90,  iLow: 101, iHigh: 200, category: 'Moderate',     color: '#FFDD44' },
  { cLow: 91,  cHigh: 120, iLow: 201, iHigh: 300, category: 'Poor',         color: '#FF8800' },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400, category: 'Very Poor',    color: '#CC0033' },
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500, category: 'Severe',       color: '#660099' },
];

// --- US EPA AQI Breakpoints for PM2.5 (24-hour average, µg/m³) ---
// Source: US EPA AQI Technical Assistance Document
const US_PM25_BREAKPOINTS: Array<{
  cLow: number; cHigh: number; iLow: number; iHigh: number;
  category: AqiCategoryUS; color: string;
}> = [
  { cLow: 0.0,   cHigh: 9.0,   iLow: 0,   iHigh: 50,  category: 'Good',                          color: '#00E400' },
  { cLow: 9.1,   cHigh: 35.4,  iLow: 51,  iHigh: 100, category: 'Moderate',                      color: '#FFFF00' },
  { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', color: '#FF7E00' },
  { cLow: 55.5,  cHigh: 125.4, iLow: 151, iHigh: 200, category: 'Unhealthy',                     color: '#FF0000' },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300, category: 'Very Unhealthy',                color: '#8F3F97' },
  { cLow: 225.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Hazardous',                     color: '#7E0023' },
];

/**
 * Linear interpolation for AQI calculation.
 * I = ((iHigh - iLow) / (cHigh - cLow)) * (C - cLow) + iLow
 */
function linearInterpolate(
  c: number,
  cLow: number, cHigh: number,
  iLow: number, iHigh: number
): number {
  return ((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow;
}

/**
 * Convert PM2.5 concentration to India National AQI.
 * @param pm25 24-hour average PM2.5 in µg/m³
 * @returns AQI value, category, and color
 */
export function pm25ToIndiaAqi(pm25: number): AqiResult {
  if (pm25 < 0) throw new Error('PM2.5 concentration cannot be negative');
  if (pm25 > 500) {
    return { value: 500, category: 'Severe', colorHex: '#660099' };
  }

  for (const bp of INDIA_PM25_BREAKPOINTS) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      const aqi = Math.round(linearInterpolate(pm25, bp.cLow, bp.cHigh, bp.iLow, bp.iHigh));
      return { value: aqi, category: bp.category, colorHex: bp.color };
    }
  }

  // Should not reach here with valid input
  return { value: 500, category: 'Severe', colorHex: '#660099' };
}

/**
 * Convert PM2.5 concentration to US EPA AQI.
 * @param pm25 24-hour average PM2.5 in µg/m³
 * @returns AQI value, category, and color
 */
export function pm25ToUsEpaAqi(pm25: number): AqiResult {
  if (pm25 < 0) throw new Error('PM2.5 concentration cannot be negative');
  if (pm25 > 500.4) {
    return { value: 500, category: 'Hazardous', colorHex: '#7E0023' };
  }

  for (const bp of US_PM25_BREAKPOINTS) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      const aqi = Math.round(linearInterpolate(pm25, bp.cLow, bp.cHigh, bp.iLow, bp.iHigh));
      return { value: aqi, category: bp.category, colorHex: bp.color };
    }
  }

  return { value: 500, category: 'Hazardous', colorHex: '#7E0023' };
}

/**
 * Get the AQI category for a given India AQI value (not concentration).
 */
export function indiaAqiCategory(aqiValue: number): AqiCategory {
  if (aqiValue <= 50) return 'Good';
  if (aqiValue <= 100) return 'Satisfactory';
  if (aqiValue <= 200) return 'Moderate';
  if (aqiValue <= 300) return 'Poor';
  if (aqiValue <= 400) return 'Very Poor';
  return 'Severe';
}
