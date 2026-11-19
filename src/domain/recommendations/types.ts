/**
 * Recommendation Types & Schemas
 * Part 2 (F6), Part 5.2 of docs/00_MASTER_SPEC.md.
 */

import { RangeValue } from '../exposure/types';
import { HouseholdMember } from '../household/types';

export type ActionCategory =
  | 'indoor_filtration'
  | 'transit_substitution'
  | 'ventilation_control'
  | 'source_reduction'
  | 'personal_protection'
  | 'behavioral_timing'
  | 'source_elimination'
  | 'hygiene';

export type EffortLevel = 'low' | 'medium' | 'high';

export interface ActionDefinition {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  effort: EffortLevel;
  estimatedCostInr: number;
  targetMicroenvironment: string;
  exposureReductionPct: RangeValue;
  co2AvoidedGramsPerKm?: number;
  pmAvoidedGramsPerKm?: number;
  citation: string;
  verified: boolean;
}

export interface WhyThisProvenance {
  ruleTriggered: string;
  targetMember: {
    ageGroup: string;
    hasAsthma: boolean;
    hasVulnerability: boolean;
  };
  ambientPm25: number;
  dataAgeMinutes: number;
  confidenceScore: number;
  isUnsure: boolean;
  scientificCitation: string;
  verified: boolean;
  isEstimate: boolean;
}

export interface ScoredAction {
  action: ActionDefinition;
  rank: number;
  targetMemberId: string;
  targetMemberName: string;
  doseAvoidedUgd: RangeValue;
  doseReductionPct: number;
  co2AvoidedGrams?: RangeValue;
  pmAvoidedGrams?: RangeValue;
  effortWeight: number;
  compositeScore: number; // dose avoided / effort
  headline: string;
  steps: string[];
  whyThis: WhyThisProvenance;
}

export interface RecommendationSet {
  householdId: string;
  evaluatedAt: string;
  vulnerableMemberName: string;
  vulnerabilityReason: string;
  baselineDoseUgd: RangeValue;
  topActions: ScoredAction[];
  allActions: ScoredAction[];
  generalTips: string[];
}

export interface MicroRoutineSlot {
  timeWindow: string;
  startHour: number;
  endHour: number;
  title: string;
  recommendation: 'seal_windows' | 'ventilate_optimal' | 'run_purifier' | 'transit_shield' | 'rest_indoor';
  status: 'good' | 'caution' | 'danger';
  rationale: string;
  ambientExpectedPm25: number;
  boundaryLayerStatus: 'inversion_trapped' | 'expanding_dispersion' | 'optimal_mixing' | 'cooling_stable';
}

export interface SmogForecastDay {
  dayIndex: number;
  dateStr: string;
  expectedAqi: number;
  expectedPm25: number;
  category: string;
  isHighSmogDay: boolean;
  recommendedPlan: string;
}

export interface SmogForecastPlannerResult {
  days: SmogForecastDay[];
  hasSevereDays: boolean;
  stagnationAlert: {
    active: boolean;
    headline: string;
    description: string;
    windSpeedMs: number;
    inversionDetected: boolean;
  };
  shoppingList: {
    item: string;
    urgency: 'tonight' | 'this_week' | 'optional';
    reason: string;
    estimatedCostInr: number;
  }[];
}

export interface CleanerRouteLeg {
  mode: string;
  name: string;
  distanceKm: number;
  durationMinutes: number;
  meanPm25ExposureUgM3: number;
  inhaledDoseUg: RangeValue;
  tailpipeCo2Grams: number;
  tailpipePmMg: number;
}

export interface CleanerRouteComparison {
  standardRoute: CleanerRouteLeg;
  cleanerRoute: CleanerRouteLeg;
  exposureAvoidedPct: number;
  doseAvoidedUg: RangeValue;
  co2AvoidedGrams: number;
  pmAvoidedMg: number;
  commuteTimeDeltaMinutes: number;
  recommendationText: string;
}
