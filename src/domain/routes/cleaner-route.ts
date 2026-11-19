/**
 * Saans Cleaner-Route Commute Comparison Engine (GS-08 / F21)
 * Evaluates alternative transit corridors combining physical inhaled dose
 * and tailpipe community emission deltas.
 * Implements Part 2 (F21) of docs/00_MASTER_SPEC.md.
 */

import { CleanerRouteComparison } from '../recommendations/types';

export interface RouteComparisonInput {
  originText: string;
  destinationText: string;
  distanceKm?: number;
  ambientPm25: number;
}

export function compareCommuteRoutes(input: RouteComparisonInput): CleanerRouteComparison {
  const { originText, destinationText, distanceKm = 10, ambientPm25 } = input;
  const roundTripKm = distanceKm * 2;

  // Standard Route: Two-Wheeler / Arterial Highway
  const stdTransitRatio = 1.20;
  const stdSpeedKmH = 25;
  const stdDurationMins = Math.round((distanceKm / stdSpeedKmH) * 60);
  const stdExposureUgM3 = Math.round(ambientPm25 * stdTransitRatio);
  
  // Child / Adult commuter light inhalation rate = ~0.85 m3/h
  const ir = 0.85;
  const stdDoseCent = Math.round((stdExposureUgM3 * ir * (stdDurationMins / 60)) * 10) / 10;
  const stdCo2 = Math.round(roundTripKm * 72); // 72 g/km petrol two-wheeler
  const stdPmMg = Math.round(roundTripKm * 0.05 * 1000); // 50 mg/km

  // Cleaner Route: Metro Rail Corridor
  const cleanTransitRatio = 0.38;
  const cleanSpeedKmH = 32;
  const cleanDurationMins = Math.round((distanceKm / cleanSpeedKmH) * 60) + 5; // +5 mins station dwell
  const cleanExposureUgM3 = Math.round(ambientPm25 * cleanTransitRatio);
  const cleanDoseCent = Math.round((cleanExposureUgM3 * ir * (cleanDurationMins / 60)) * 10) / 10;
  const cleanCo2 = Math.round(roundTripKm * 16); // 16 g/km electric rail
  const cleanPmMg = Math.round(roundTripKm * 0.002 * 1000); // 2 mg/km

  const doseAvoided = Math.round((stdDoseCent - cleanDoseCent) * 10) / 10;
  const pctAvoided = Math.round((doseAvoided / stdDoseCent) * 1000) / 10;
  const co2Avoided = stdCo2 - cleanCo2;
  const pmAvoided = stdPmMg - cleanPmMg;

  return {
    standardRoute: {
      mode: 'Two-Wheeler (Arterial Ring Road)',
      name: `${originText} to ${destinationText} via Ring Road`,
      distanceKm,
      durationMinutes: stdDurationMins,
      meanPm25ExposureUgM3: stdExposureUgM3,
      inhaledDoseUg: {
        low: Math.round(stdDoseCent * 0.8 * 10) / 10,
        central: stdDoseCent,
        high: Math.round(stdDoseCent * 1.3 * 10) / 10,
      },
      tailpipeCo2Grams: stdCo2,
      tailpipePmMg: stdPmMg,
    },
    cleanerRoute: {
      mode: 'Metro Rail + Walking Buffer',
      name: `${originText} to ${destinationText} via Metro Purple Line`,
      distanceKm: distanceKm + 0.8,
      durationMinutes: cleanDurationMins,
      meanPm25ExposureUgM3: cleanExposureUgM3,
      inhaledDoseUg: {
        low: Math.round(cleanDoseCent * 0.8 * 10) / 10,
        central: cleanDoseCent,
        high: Math.round(cleanDoseCent * 1.3 * 10) / 10,
      },
      tailpipeCo2Grams: cleanCo2,
      tailpipePmMg: cleanPmMg,
    },
    exposureAvoidedPct: pctAvoided,
    doseAvoidedUg: {
      low: Math.round(doseAvoided * 0.8 * 10) / 10,
      central: doseAvoided,
      high: Math.round(doseAvoided * 1.3 * 10) / 10,
    },
    co2AvoidedGrams: co2Avoided,
    pmAvoidedMg: pmAvoided,
    commuteTimeDeltaMinutes: cleanDurationMins - stdDurationMins,
    recommendationText: `Shifting from two-wheeler to metro avoids ${doseAvoided} µg (${pctAvoided}%) of inhaled toxic dust per commute and cuts ${co2Avoided} g of tailpipe CO2 today.`,
  };
}
