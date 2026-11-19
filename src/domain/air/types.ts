/**
 * Saans Air Quality Domain Types
 * Normalization contract for all air quality providers.
 */

export type NaqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type FreshnessTier = 'live' | 'recent' | 'stale' | 'very_stale';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface PollutantValues {
  pm25?: number | null;     // µg/m³
  pm10?: number | null;     // µg/m³
  no2?: number | null;      // µg/m³
  so2?: number | null;      // µg/m³
  co?: number | null;       // mg/m³
  o3?: number | null;       // µg/m³
}

export interface NaqiSubIndex {
  pollutant: keyof PollutantValues;
  concentration: number;
  subIndex: number;
  category: NaqiCategory;
}

export interface NaqiResult {
  overallAqi: number;
  dominantPollutant: keyof PollutantValues;
  category: NaqiCategory;
  colorHex: string;
  isPartial: boolean;       // True if fewer than 3 pollutants or missing PM2.5/PM10
  subIndices: NaqiSubIndex[];
}

export interface ConfidenceAssessment {
  score: number;            // 0.0 to 1.0
  tier: ConfidenceTier;
  isUnsure: boolean;        // True if score < 0.45 or stale
  factors: {
    dataAgeScore: number;
    distanceScore: number;
    completenessScore: number;
    providerAgreementScore: number;
  };
  explanation: string;
}

export interface AirReading {
  id: string;
  location: {
    lat: number;
    lon: number;
    gridCell: string;       // e.g. "28.61,77.21"
    name?: string;
  };
  pollutants: PollutantValues;
  naqi: NaqiResult;
  confidence: ConfidenceAssessment;
  provenance: {
    source: 'google_air_quality' | 'cpcb' | 'openaq' | 'open_meteo_cams' | 'cached_fallback';
    stationOrGrid: string;
    stationDistanceKm?: number | null;
    observedAt: string;     // ISO timestamp
    ageMinutes: number;
    freshness: FreshnessTier;
  };
}

export interface AirForecastItem {
  timestamp: string;
  pm25: number;
  naqi: number;
  category: NaqiCategory;
  dominantPollutant: string;
  windSpeedKmh?: number;
  windDirectionDeg?: number;
  stagnationRisk: boolean;
}

export interface AirProvider {
  readonly name: string;
  readonly priority: number; // 1 = highest preference
  isAvailable(): Promise<boolean>;
  getCurrent(lat: number, lon: number): Promise<AirReading>;
  getForecast?(lat: number, lon: number): Promise<AirForecastItem[]>;
}
