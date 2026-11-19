/**
 * Saans Exposure Domain Types
 * Implements Science Specification Part 3.2, 3.3, 3.4 & 3.5.
 */

import { AgeGroup, CommuteMode } from '../household/types';

export interface RangeValue {
  low: number;
  central: number;
  high: number;
}

export type ActivityLevel = 'sleep' | 'sedentary' | 'light' | 'moderate' | 'heavy';

export type MicroenvironmentType = 'home' | 'transit' | 'school_office' | 'outdoor';

export interface TimeSegment {
  name: string;
  startHour: number; // 0 to 23
  endHour: number;   // 1 to 24
  microenvironment: MicroenvironmentType;
  activity: ActivityLevel;
  commuteMode?: CommuteMode;
  isPurifierActive?: boolean;
}

export interface SegmentDoseContribution {
  name: string;
  durationHours: number;
  concentrationUgM3: RangeValue;
  inhalationRateM3h: RangeValue;
  doseUgd: RangeValue;
  percentOfTotal: number;
}

export interface ExposureResult {
  memberAlias: string;
  ageGroup: AgeGroup;
  doseUgd: RangeValue;
  exposureRatio: RangeValue; // Dose / Dose_ref (WHO 24h 15 ug/m3 guideline)
  timeWeightedMeanConc: RangeValue; // ug/m3
  cigaretteEquivalent: RangeValue;
  segments: SegmentDoseContribution[];
  whoGuidelineDoseRef: number; // Inhaled dose at continuous WHO 15 ug/m3
}

export interface WhatIfOverrides {
  purifierHours?: number;      // e.g. 8 hours in bedroom
  purifierCadrM3h?: number;    // CADR delivered in m3/h
  commuteMode?: CommuteMode;   // e.g. switch bike to metro
  roundTripKm?: number;        // commute distance in km
  useKitchenChimney?: boolean; // exhaust on during cooking
  avoidIncense?: boolean;      // stop burning agarbatti
  keepWindowsClosed?: boolean; // seal during morning inversion
}

export interface EmissionsAvoided {
  co2Grams: RangeValue;
  pmGrams: RangeValue;
}

export interface WhatIfResult {
  baselineDose: RangeValue;
  scenarioDose: RangeValue;
  deltaDoseUgd: RangeValue;     // baseline - scenario (positive = exposure avoided)
  deltaPercent: number;         // percentage reduction
  deltaExposureRatio: RangeValue;
  emissionsAvoided: EmissionsAvoided;
  isZeroChange: boolean;        // true if no change from baseline
}
