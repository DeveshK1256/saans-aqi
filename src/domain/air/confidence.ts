/**
 * Saans Data Confidence & Staleness Meter
 * Implements Part 3.10 of docs/00_MASTER_SPEC.md.
 * Evaluates data trustworthiness based on age, station distance, completeness, and provider agreement.
 */

import { ConfidenceAssessment, ConfidenceTier, PollutantValues } from './types';

export interface ConfidenceInput {
  ageMinutes: number;
  stationDistanceKm?: number | null;
  pollutants: PollutantValues;
  providerDisagreementPct?: number; // 0 to 100%
  isGriddedModel?: boolean;
}

export function assessConfidence(input: ConfidenceInput): ConfidenceAssessment {
  const { ageMinutes, stationDistanceKm, pollutants, providerDisagreementPct = 0, isGriddedModel = false } = input;

  // 1. Data Age Factor (weight: 0.40)
  // Full confidence if age <= 60 mins. Linear decay to 0 at 360 mins (6 hours).
  let dataAgeScore: number;
  if (ageMinutes <= 60) {
    dataAgeScore = 1.0;
  } else if (ageMinutes >= 360) {
    dataAgeScore = 0.0;
  } else {
    dataAgeScore = (360 - ageMinutes) / 300;
  }

  // 2. Distance Factor (weight: 0.30)
  // Full confidence if <= 2 km. Linear decay to 0 at 25 km. If gridded reanalysis, fixed 0.65.
  let distanceScore: number;
  if (isGriddedModel || stationDistanceKm === null || stationDistanceKm === undefined) {
    distanceScore = 0.65;
  } else if (stationDistanceKm <= 2.0) {
    distanceScore = 1.0;
  } else if (stationDistanceKm >= 25.0) {
    distanceScore = 0.0;
  } else {
    distanceScore = (25.0 - stationDistanceKm) / 23.0;
  }

  // 3. Completeness Factor (weight: 0.20)
  // 6 criteria pollutants: PM2.5, PM10, NO2, SO2, CO, O3. Must have PM2.5 or PM10.
  const measuredCount = Object.values(pollutants).filter(
    (v) => typeof v === 'number' && !isNaN(v)
  ).length;
  const hasParticulate = (pollutants.pm25 !== null && pollutants.pm25 !== undefined) ||
                         (pollutants.pm10 !== null && pollutants.pm10 !== undefined);

  let completenessScore = Math.min(1.0, measuredCount / 5.0);
  if (!hasParticulate) completenessScore *= 0.3;

  // 4. Provider Agreement Factor (weight: 0.10)
  // 0% disagreement = 1.0; 50%+ disagreement = 0.0
  const agreementScore = Math.max(0.0, 1.0 - providerDisagreementPct / 50.0);

  // Weighted overall confidence score (0.0 to 1.0)
  const rawScore =
    dataAgeScore * 0.40 +
    distanceScore * 0.30 +
    completenessScore * 0.20 +
    agreementScore * 0.10;

  const score = Math.round(Math.max(0.0, Math.min(1.0, rawScore)) * 100) / 100;

  let tier: ConfidenceTier;
  if (score >= 0.75) {
    tier = 'high';
  } else if (score >= 0.45) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  const isUnsure = score < 0.45 || ageMinutes > 180;

  let explanation: string;
  if (isUnsure) {
    explanation = "I'm unsure: Data is older than 3 hours or distant from your locality. Displaying conservative protective guidance.";
  } else if (tier === 'high') {
    explanation = 'High confidence: Fresh local monitor reading with multiple pollutants measured.';
  } else {
    explanation = 'Medium confidence: Station data is either slightly distant or missing secondary gaseous pollutants.';
  }

  return {
    score,
    tier,
    isUnsure,
    factors: {
      dataAgeScore: Math.round(dataAgeScore * 100) / 100,
      distanceScore: Math.round(distanceScore * 100) / 100,
      completenessScore: Math.round(completenessScore * 100) / 100,
      providerAgreementScore: Math.round(agreementScore * 100) / 100,
    },
    explanation,
  };
}
