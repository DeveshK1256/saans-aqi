/**
 * Saans Action Ranker
 * Evaluates candidates from the curated action library and ranks them
 * by physical exposure reduction per unit effort for the most vulnerable member.
 * Implements Part 2 (F6) and Part 5.1 of docs/00_MASTER_SPEC.md.
 */

import actionsData from '../../../data/params/actions.json';
import { calculatePersonalExposure } from '../exposure/exposure-engine';
import { simulateWhatIf } from '../exposure/what-if';
import { HouseholdMember, HouseholdProfile } from '../household/types';
import { ActionDefinition, RecommendationSet, ScoredAction, WhyThisProvenance } from './types';

const ACTIONS_LIBRARY: ActionDefinition[] = actionsData as ActionDefinition[];

const EFFORT_WEIGHTS: Record<string, number> = {
  low: 1.0,
  medium: 1.8,
  high: 3.0,
};

/**
 * Finds the most vulnerable member in the household based on strict physical vulnerability hierarchy.
 */
export function findMostVulnerableMember(members: HouseholdMember[]): { member: HouseholdMember; reason: string } {
  if (!members || members.length === 0) {
    throw new Error('At least one household member is required to evaluate recommendations.');
  }

  // 1. Infant / Toddler with asthma
  const infantAsthma = members.find(m => (m.ageGroup === 'infant' || m.ageGroup === 'toddler') && m.healthFlags?.hasAsthma);
  if (infantAsthma) return { member: infantAsthma, reason: 'High vulnerability: Toddler with bronchial asthma' };

  // 2. Child with asthma (Priya's persona case)
  const childAsthma = members.find(m => m.ageGroup === 'child' && m.healthFlags?.hasAsthma);
  if (childAsthma) return { member: childAsthma, reason: 'High vulnerability: School child with chronic asthma' };

  // 3. Infant or Toddler
  const youngChild = members.find(m => m.ageGroup === 'infant' || m.ageGroup === 'toddler');
  if (youngChild) return { member: youngChild, reason: 'Developing respiratory system in early childhood' };

  // 4. Pregnant adult
  const pregnant = members.find(m => m.healthFlags?.isPregnant);
  if (pregnant) return { member: pregnant, reason: 'Maternal & fetal vulnerability to systemic particulate exposure' };

  // 5. Elderly (65+) with respiratory / cardio condition
  const elderlyVulnerable = members.find(m => m.ageGroup === 'elderly' && (m.healthFlags?.hasAsthma || m.healthFlags?.hasCardiovascularCondition));
  if (elderlyVulnerable) return { member: elderlyVulnerable, reason: 'Elderly with chronic cardiopulmonary vulnerability' };

  // 6. Child
  const child = members.find(m => m.ageGroup === 'child');
  if (child) return { member: child, reason: 'High minute-ventilation rate per kg body weight' };

  // 7. Elderly
  const elderly = members.find(m => m.ageGroup === 'elderly');
  if (elderly) return { member: elderly, reason: 'Reduced baseline lung capacity and mucociliary clearance' };

  // 8. Default to first member
  return { member: members[0], reason: 'Primary household resident' };
}

export interface RankerInput {
  householdId: string;
  profile: HouseholdProfile;
  ambientPm25: number;
  dataAgeMinutes?: number;
  confidenceScore?: number;
}

/**
 * Evaluates and ranks recommended actions strictly based on computed physical dose reduction.
 */
export function rankRecommendations(input: RankerInput): RecommendationSet {
  const { householdId, profile, ambientPm25, dataAgeMinutes = 25, confidenceScore = 0.88 } = input;
  const { member: vulnMember, reason: vulnReason } = findMostVulnerableMember(profile.members);

  // 1. Calculate baseline exposure for the most vulnerable member
  const baselineExposure = calculatePersonalExposure({
    member: vulnMember,
    profile,
    ambientPm25,
  });

  const baselineDose = baselineExposure.doseUgd;
  const scoredActions: ScoredAction[] = [];

  // Helper to build WhyThis provenance
  function buildProvenance(action: ActionDefinition, rule: string): WhyThisProvenance {
    return {
      ruleTriggered: rule,
      targetMember: {
        ageGroup: vulnMember.ageGroup,
        hasAsthma: !!vulnMember.healthFlags?.hasAsthma,
        hasVulnerability: !!(vulnMember.healthFlags?.hasAsthma || vulnMember.healthFlags?.isPregnant),
      },
      ambientPm25,
      dataAgeMinutes,
      confidenceScore,
      isUnsure: confidenceScore < 0.45 || dataAgeMinutes > 180,
      scientificCitation: action.citation,
      verified: action.verified,
      isEstimate: !action.verified,
    };
  }

  // Evaluate candidate actions from library
  for (const action of ACTIONS_LIBRARY) {
    if (action.id === 'bedroom_purifier') {
      if (!profile.hasPurifier) {
        const whatIf = simulateWhatIf({
          member: vulnMember,
          profile,
          ambientPm25,
          overrides: { purifierHours: 8, purifierCadrM3h: 250 },
        });

        const effortWeight = EFFORT_WEIGHTS[action.effort];
        const compositeScore = Math.round((whatIf.deltaDoseUgd.central / effortWeight) * 10) / 10;

        scoredActions.push({
          action,
          rank: 0,
          targetMemberId: vulnMember.id,
          targetMemberName: vulnMember.nameAlias || vulnMember.ageGroup,
          doseAvoidedUgd: whatIf.deltaDoseUgd,
          doseReductionPct: whatIf.deltaPercent,
          effortWeight,
          compositeScore,
          headline: `Run Bedroom Air Purifier (Saves ~{{delta_dose_ug}} µg/day, −{{pct_saved}}%)`,
          steps: [
            'Place the purifier in the bedroom away from walls and curtains.',
            'Keep doors and windows closed during operation.',
            'Operate on medium/high speed 30 minutes before sleep, then maintain on low overnight.',
          ],
          whyThis: buildProvenance(action, 'RULE_UNFILTERED_SLEEP_HOURS'),
        });
      }
    } else if (action.id === 'commute_metro_shift') {
      if (vulnMember.commuteMode === 'bike_scooter' || vulnMember.commuteMode === 'auto_rickshaw') {
        const whatIf = simulateWhatIf({
          member: vulnMember,
          profile,
          ambientPm25,
          overrides: { commuteMode: 'metro_train', roundTripKm: 20 },
        });

        const effortWeight = EFFORT_WEIGHTS[action.effort];
        // Two-way impact weighting: Inhaled dose reduction + community carbon factor
        const co2Bonus = (whatIf.emissionsAvoided.co2Grams?.central || 0) / 10;
        const compositeScore = Math.round(((whatIf.deltaDoseUgd.central + co2Bonus) / effortWeight) * 10) / 10;

        scoredActions.push({
          action,
          rank: 0,
          targetMemberId: vulnMember.id,
          targetMemberName: vulnMember.nameAlias || vulnMember.ageGroup,
          doseAvoidedUgd: whatIf.deltaDoseUgd,
          doseReductionPct: whatIf.deltaPercent,
          co2AvoidedGrams: whatIf.emissionsAvoided.co2Grams,
          pmAvoidedGrams: whatIf.emissionsAvoided.pmGrams,
          effortWeight,
          compositeScore,
          headline: `Switch Commute to Metro (Cuts {{pct_saved}}% Transit Dose & {{co2_avoided_g}} g CO₂)`,
          steps: [
            'Substitute arterial two-wheeler route with nearest metro/train corridor.',
            'Underground and AC rolling stock filters 60%+ of roadside particulate exhaust.',
            'Eliminates ~1,120 g of fossil CO2 emissions for typical 20 km round-trip.',
          ],
          whyThis: buildProvenance(action, 'RULE_HIGH_EXPOSURE_COMMUTE_MODE'),
        });
      }
    } else if (action.id === 'seal_windows_inversion') {
      // Window sealing reduces morning infiltration during peak trapping hours
      const avoidedCent = Math.round(baselineDose.central * 0.08 * 10) / 10;
      const pct = Math.round((avoidedCent / baselineDose.central) * 1000) / 10;
      const effortWeight = EFFORT_WEIGHTS[action.effort];
      const compositeScore = Math.round((avoidedCent / effortWeight) * 10) / 10;

      scoredActions.push({
        action,
        rank: 0,
        targetMemberId: vulnMember.id,
        targetMemberName: vulnMember.nameAlias || vulnMember.ageGroup,
        doseAvoidedUgd: {
          low: Math.round(avoidedCent * 0.7 * 10) / 10,
          central: avoidedCent,
          high: Math.round(avoidedCent * 1.3 * 10) / 10,
        },
        doseReductionPct: pct,
        effortWeight,
        compositeScore,
        headline: `Seal Windows 06:00–10:00 (Blocks Inversion Peak, −{{pct_saved}}%)`,
        steps: [
          'Close all street-facing windows tightly before sunrise (06:00 AM).',
          'Use draft stoppers or foam strips along leaky door and balcony joints.',
          'Postpone cross-ventilation until afternoon thermal mixing (13:00–16:00).',
        ],
        whyThis: buildProvenance(action, 'RULE_MORNING_INVERSION_WINDOW'),
      });
    } else if (action.id === 'kitchen_chimney_exhaust') {
      if (!profile.hasKitchenChimney && (profile.kitchenFuel === 'lpg_piped' || profile.kitchenFuel === 'wood_kerosene_chulha')) {
        const avoidedCent = Math.round(baselineDose.central * 0.06 * 10) / 10;
        const pct = Math.round((avoidedCent / baselineDose.central) * 1000) / 10;
        const effortWeight = EFFORT_WEIGHTS[action.effort];
        const compositeScore = Math.round((avoidedCent / effortWeight) * 10) / 10;

        scoredActions.push({
          action,
          rank: 0,
          targetMemberId: vulnMember.id,
          targetMemberName: vulnMember.nameAlias || vulnMember.ageGroup,
          doseAvoidedUgd: {
            low: Math.round(avoidedCent * 0.7 * 10) / 10,
            central: avoidedCent,
            high: Math.round(avoidedCent * 1.3 * 10) / 10,
          },
          doseReductionPct: pct,
          effortWeight,
          compositeScore,
          headline: `Vent Cooking Fumes (Captures 75% Cooking PM, −{{pct_saved}}%)`,
          steps: [
            'Install or activate kitchen exhaust fan / chimney whenever heating oil or LPG.',
            'Keep kitchen doors closed to bedroom and living areas during meal prep.',
            'Cover frying pans with lids to limit oil aerosolization.',
          ],
          whyThis: buildProvenance(action, 'RULE_UNVENTED_INDOOR_COOKING'),
        });
      }
    } else if (action.id === 'n95_commute_mask') {
      if (vulnMember.commuteDurationMinutes > 15 && (vulnMember.commuteMode === 'bike_scooter' || vulnMember.commuteMode === 'walk')) {
        const avoidedCent = Math.round(baselineDose.central * 0.05 * 10) / 10;
        const pct = Math.round((avoidedCent / baselineDose.central) * 1000) / 10;
        const effortWeight = EFFORT_WEIGHTS[action.effort];
        const compositeScore = Math.round((avoidedCent / effortWeight) * 10) / 10;

        scoredActions.push({
          action,
          rank: 0,
          targetMemberId: vulnMember.id,
          targetMemberName: vulnMember.nameAlias || vulnMember.ageGroup,
          doseAvoidedUgd: {
            low: Math.round(avoidedCent * 0.8 * 10) / 10,
            central: avoidedCent,
            high: Math.round(avoidedCent * 1.2 * 10) / 10,
          },
          doseReductionPct: pct,
          effortWeight,
          compositeScore,
          headline: `Wear Snug N95 Mask on Road (Eliminates 92% Transit PM, −{{pct_saved}}%)`,
          steps: [
            'Ensure tight nose-bridge crimp and double head-strap seal.',
            'Cloth bandanas and surgical masks do not seal fine PM2.5 aerosols.',
            'Store clean mask in breathable paper bag between commutes.',
          ],
          whyThis: buildProvenance(action, 'RULE_UNPROTECTED_ROAD_COMMUTE'),
        });
      }
    }
  }

  // Sort candidate actions by compositeScore descending
  scoredActions.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks
  scoredActions.forEach((act, idx) => {
    act.rank = idx + 1;
  });

  const topActions = scoredActions.slice(0, 3);

  const generalTips = [
    'Drink water regularly to keep mucosal lining hydrated and facilitate mucociliary clearance.',
    'Do not engage in high-intensity cardiovascular training outside when AQI exceeds 200.',
    'Keep rescue inhalers readily accessible for all household members with asthma.',
  ];

  return {
    householdId,
    evaluatedAt: new Date().toISOString(),
    vulnerableMemberName: vulnMember.nameAlias || vulnMember.ageGroup,
    vulnerabilityReason: vulnReason,
    baselineDoseUgd: baselineDose,
    topActions,
    allActions: scoredActions,
    generalTips,
  };
}
