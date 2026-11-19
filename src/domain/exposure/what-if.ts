/**
 * Saans What-If Simulator & Two-Way Impact Engine
 * Implements Part 3.4 & 3.5 of docs/00_MASTER_SPEC.md.
 *
 * Guarantees:
 * - Deterministic, pure calculation
 * - Invariant: Zero-change scenario returns exactly zero delta (0.0 ug, 0.0%, 0.0 g CO2)
 * - Two-way impact: Calculates both personal exposure reduction AND community emissions avoided
 */

import { CommuteMode, HouseholdMember, HouseholdProfile } from '../household/types';
import { calculatePersonalExposure } from './exposure-engine';
import { RangeValue, WhatIfOverrides, WhatIfResult } from './types';

// Emission factors per passenger-kilometer from data/params/emissions_factors.json (ARAI / CPCB)
export const EMISSION_FACTORS: Record<string, { co2GramsPerKm: RangeValue; pmGramsPerKm: RangeValue }> = {
  bike_scooter: {
    co2GramsPerKm: { low: 55, central: 72, high: 90 },
    pmGramsPerKm: { low: 0.03, central: 0.05, high: 0.08 },
  },
  metro_train: {
    co2GramsPerKm: { low: 10, central: 16, high: 24 },
    pmGramsPerKm: { low: 0.001, central: 0.002, high: 0.004 },
  },
  car_ac: {
    co2GramsPerKm: { low: 140, central: 175, high: 220 },
    pmGramsPerKm: { low: 0.04, central: 0.07, high: 0.12 },
  },
  bus: {
    co2GramsPerKm: { low: 25, central: 38, high: 55 },
    pmGramsPerKm: { low: 0.005, central: 0.012, high: 0.020 },
  },
  walk: {
    co2GramsPerKm: { low: 0, central: 0, high: 0 },
    pmGramsPerKm: { low: 0, central: 0, high: 0 },
  },
};

export interface WhatIfInput {
  member: HouseholdMember;
  profile: HouseholdProfile;
  ambientPm25: number;
  overrides: WhatIfOverrides;
}

/**
 * Runs the what-if simulation comparing baseline household profile with proposed overrides.
 */
export function simulateWhatIf(input: WhatIfInput): WhatIfResult {
  const { member, profile, ambientPm25, overrides } = input;

  // 1. Calculate Baseline Exposure
  const baseline = calculatePersonalExposure({
    member,
    profile,
    ambientPm25,
  });

  // 2. Check for zero-change scenario
  const isPurifierUnchanged = overrides.purifierHours === undefined ||
    (overrides.purifierHours === (profile.hasPurifier ? 8 : 0));
  const isCommuteUnchanged = !overrides.commuteMode || overrides.commuteMode === member.commuteMode;
  const isChimneyUnchanged = overrides.useKitchenChimney === undefined ||
    overrides.useKitchenChimney === profile.hasKitchenChimney;

  const isZeroChange = isPurifierUnchanged && isCommuteUnchanged && isChimneyUnchanged;

  if (isZeroChange) {
    return {
      baselineDose: baseline.doseUgd,
      scenarioDose: baseline.doseUgd,
      deltaDoseUgd: { low: 0.0, central: 0.0, high: 0.0 },
      deltaPercent: 0.0,
      deltaExposureRatio: { low: 0.0, central: 0.0, high: 0.0 },
      emissionsAvoided: {
        co2Grams: { low: 0.0, central: 0.0, high: 0.0 },
        pmGrams: { low: 0.0, central: 0.0, high: 0.0 },
      },
      isZeroChange: true,
    };
  }

  // 3. Calculate Scenario Exposure with overrides
  const scenario = calculatePersonalExposure({
    member,
    profile,
    ambientPm25,
    purifierRunningHours: overrides.purifierHours,
    purifierCadrM3h: overrides.purifierCadrM3h,
    commuteModeOverride: overrides.commuteMode,
    useKitchenChimneyOverride: overrides.useKitchenChimney,
  });

  // Delta dose (dose avoided)
  const deltaDoseUgd: RangeValue = {
    low: Math.round((baseline.doseUgd.low - scenario.doseUgd.low) * 10) / 10,
    central: Math.round((baseline.doseUgd.central - scenario.doseUgd.central) * 10) / 10,
    high: Math.round((baseline.doseUgd.high - scenario.doseUgd.high) * 10) / 10,
  };

  const deltaPercent = baseline.doseUgd.central > 0
    ? Math.round(((baseline.doseUgd.central - scenario.doseUgd.central) / baseline.doseUgd.central) * 1000) / 10
    : 0.0;

  const deltaExposureRatio: RangeValue = {
    low: Math.round((baseline.exposureRatio.low - scenario.exposureRatio.low) * 10) / 10,
    central: Math.round((baseline.exposureRatio.central - scenario.exposureRatio.central) * 10) / 10,
    high: Math.round((baseline.exposureRatio.high - scenario.exposureRatio.high) * 10) / 10,
  };

  // 4. Calculate Two-Way Impact: Avoided Community Emissions
  let co2Avoided: RangeValue = { low: 0, central: 0, high: 0 };
  let pmAvoided: RangeValue = { low: 0, central: 0, high: 0 };

  if (overrides.commuteMode && overrides.commuteMode !== member.commuteMode) {
    const roundTripKm = overrides.roundTripKm || 20.0;
    const oldEf = EMISSION_FACTORS[member.commuteMode] || EMISSION_FACTORS.bike_scooter;
    const newEf = EMISSION_FACTORS[overrides.commuteMode] || EMISSION_FACTORS.metro_train;

    co2Avoided = {
      low: Math.round(roundTripKm * Math.max(0, oldEf.co2GramsPerKm.low - newEf.co2GramsPerKm.low)),
      central: Math.round(roundTripKm * Math.max(0, oldEf.co2GramsPerKm.central - newEf.co2GramsPerKm.central)),
      high: Math.round(roundTripKm * Math.max(0, oldEf.co2GramsPerKm.high - newEf.co2GramsPerKm.high)),
    };

    pmAvoided = {
      low: Math.round(roundTripKm * Math.max(0, oldEf.pmGramsPerKm.low - newEf.pmGramsPerKm.low) * 100) / 100,
      central: Math.round(roundTripKm * Math.max(0, oldEf.pmGramsPerKm.central - newEf.pmGramsPerKm.central) * 100) / 100,
      high: Math.round(roundTripKm * Math.max(0, oldEf.pmGramsPerKm.high - newEf.pmGramsPerKm.high) * 100) / 100,
    };
  }

  return {
    baselineDose: baseline.doseUgd,
    scenarioDose: scenario.doseUgd,
    deltaDoseUgd,
    deltaPercent,
    deltaExposureRatio,
    emissionsAvoided: {
      co2Grams: co2Avoided,
      pmGrams: pmAvoided,
    },
    isZeroChange: false,
  };
}
