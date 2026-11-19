/**
 * Saans Personal Exposure Calculation Engine
 * Implements Part 3.2 of docs/00_MASTER_SPEC.md.
 *
 * Core Equation:
 *   Dose_m = sum_s [ C_e(t) * IR(m, a) * dt ] (in micrograms)
 *   Exposure Ratio = Dose_m / Dose_ref (where Dose_ref is continuous exposure at WHO 2021 15 ug/m3 guideline)
 */

import { AgeGroup, CommuteMode, HouseholdMember, HouseholdProfile } from '../household/types';
import { ActivityLevel, ExposureResult, RangeValue, SegmentDoseContribution, TimeSegment } from './types';
import { solveMassBalance } from './mass-balance';

// Sourced inhalation rates from data/params/inhalation_rates.json (US EPA Exposure Factors Handbook 2011, Table 6-1)
export const INHALATION_RATES: Record<AgeGroup, Record<ActivityLevel, RangeValue>> = {
  infant: {
    sleep: { low: 0.15, central: 0.22, high: 0.30 },
    sedentary: { low: 0.20, central: 0.28, high: 0.38 },
    light: { low: 0.35, central: 0.45, high: 0.60 },
    moderate: { low: 0.50, central: 0.70, high: 0.95 },
    heavy: { low: 0.80, central: 1.10, high: 1.50 },
  },
  toddler: {
    sleep: { low: 0.20, central: 0.27, high: 0.35 },
    sedentary: { low: 0.25, central: 0.34, high: 0.45 },
    light: { low: 0.45, central: 0.58, high: 0.75 },
    moderate: { low: 0.70, central: 0.92, high: 1.20 },
    heavy: { low: 1.10, central: 1.45, high: 1.90 },
  },
  child: {
    sleep: { low: 0.25, central: 0.32, high: 0.42 },
    sedentary: { low: 0.30, central: 0.40, high: 0.55 },
    light: { low: 0.55, central: 0.72, high: 0.95 },
    moderate: { low: 0.90, central: 1.25, high: 1.65 },
    heavy: { low: 1.50, central: 2.05, high: 2.70 },
  },
  adult: {
    sleep: { low: 0.30, central: 0.40, high: 0.52 },
    sedentary: { low: 0.35, central: 0.50, high: 0.68 },
    light: { low: 0.80, central: 1.15, high: 1.50 },
    moderate: { low: 1.40, central: 1.85, high: 2.40 },
    heavy: { low: 2.40, central: 3.10, high: 4.10 },
  },
  elderly: {
    sleep: { low: 0.28, central: 0.36, high: 0.48 },
    sedentary: { low: 0.32, central: 0.45, high: 0.62 },
    light: { low: 0.70, central: 0.98, high: 1.35 },
    moderate: { low: 1.20, central: 1.60, high: 2.10 },
    heavy: { low: 2.00, central: 2.65, high: 3.50 },
  },
};

// Sourced in-transit ratios from data/params/transit_ratios.json (Apte et al., 2011; Goel & Kumar, 2015)
export const TRANSIT_RATIOS: Record<CommuteMode, RangeValue> = {
  walk: { low: 0.85, central: 1.00, high: 1.25 },
  bike_scooter: { low: 1.00, central: 1.20, high: 1.55 },
  auto_rickshaw: { low: 0.95, central: 1.15, high: 1.45 },
  bus: { low: 0.70, central: 0.85, high: 1.10 },
  car_ac: { low: 0.20, central: 0.32, high: 0.48 },
  metro_train: { low: 0.25, central: 0.38, high: 0.52 },
};

export interface ExposureEngineInput {
  member: HouseholdMember;
  profile: HouseholdProfile;
  ambientPm25: number; // 24h mean outdoor concentration in ug/m3
  purifierRunningHours?: number; // Override: hours bedroom purifier is active
  purifierCadrM3h?: number; // Override: purifier CADR in m3/h
  commuteModeOverride?: CommuteMode;
  useKitchenChimneyOverride?: boolean;
}

/**
 * Calculates 24-hour physical inhaled PM2.5 dose across low, central, and high parameter bounds.
 */
export function calculatePersonalExposure(input: ExposureEngineInput): ExposureResult {
  const { member, profile, ambientPm25 } = input;

  const commuteMode = input.commuteModeOverride || member.commuteMode;
  const commuteHours = Math.max(0.2, member.commuteDurationMinutes / 60);

  const purifierHours = input.purifierRunningHours !== undefined
    ? input.purifierRunningHours
    : (profile.hasPurifier ? 8 : 0);

  const cadrM3h = input.purifierCadrM3h !== undefined
    ? input.purifierCadrM3h
    : (profile.hasPurifier ? 250 : 0);

  const hasChimney = input.useKitchenChimneyOverride !== undefined
    ? input.useKitchenChimneyOverride
    : profile.hasKitchenChimney;

  // Define standard 24-hour daily microenvironment schedule
  const sleepHours = member.ageGroup === 'child' || member.ageGroup === 'toddler' ? 9.5 : 8.0;
  const workSchoolHours = member.ageGroup === 'elderly' ? 0 : (member.ageGroup === 'child' ? 6.5 : 8.0);
  const homeAwakeHours = Math.max(1.0, 24.0 - sleepHours - 2 * commuteHours - workSchoolHours);

  // Evaluate across parameter vectors: 'low', 'central', 'high'
  const vectors: ('low' | 'central' | 'high')[] = ['low', 'central', 'high'];

  const resultsByVector = vectors.map((vec) => {
    // 1. Infiltration & physical properties
    const P = vec === 'low' ? 0.65 : vec === 'central' ? 0.80 : 0.95;
    const k = vec === 'low' ? 0.10 : vec === 'central' ? 0.25 : 0.45;
    const a = profile.windowSealing === 'tight'
      ? (vec === 'low' ? 0.20 : 0.35)
      : (vec === 'low' ? 0.35 : vec === 'central' ? 0.65 : 1.10);

    const roomVol = vec === 'low' ? 32.0 : vec === 'central' ? 40.0 : 52.0;

    // 2. Indoor source emissions rate (S in ug/h)
    let S = 0;
    if (profile.kitchenFuel === 'lpg_piped') {
      S += hasChimney ? (vec === 'low' ? 250 : vec === 'central' ? 550 : 950) : (vec === 'low' ? 1200 : vec === 'central' ? 2400 : 4500);
    } else if (profile.kitchenFuel === 'wood_kerosene_chulha') {
      S += vec === 'low' ? 6000 : vec === 'central' ? 12000 : 22000;
    }
    if (profile.hasIncenseOrCoils) {
      S += vec === 'low' ? 1800 : vec === 'central' ? 3200 : 5500;
    }

    // 3. Microenvironmental Concentrations
    // a) Bedroom overnight (with purifier if enabled)
    const effectiveCadrSleep = purifierHours > 0 ? cadrM3h : 0;
    const bedroomSim = solveMassBalance({
      airExchangeRate: a,
      penetrationFactor: P,
      depositionRate: k,
      cadrEffectiveM3h: effectiveCadrSleep,
      roomVolumeM3: roomVol,
      indoorSourceRateUgH: 0, // no cooking during sleep
      outdoorConcUgM3: ambientPm25,
      initialIndoorConcUgM3: ambientPm25 * 0.7,
      timeStepHours: sleepHours,
    });
    const cSleep = bedroomSim.averageConcUgM3;

    // b) Home daytime (cooking and ambient penetration)
    const effectiveCadrDay = purifierHours > 8 ? cadrM3h * 0.5 : 0;
    const daytimeHomeSim = solveMassBalance({
      airExchangeRate: a,
      penetrationFactor: P,
      depositionRate: k,
      cadrEffectiveM3h: effectiveCadrDay,
      roomVolumeM3: roomVol * 2.2, // living area volume
      indoorSourceRateUgH: S,
      outdoorConcUgM3: ambientPm25,
      initialIndoorConcUgM3: cSleep,
      timeStepHours: homeAwakeHours,
    });
    const cHomeDay = daytimeHomeSim.averageConcUgM3;

    // c) In-transit commute concentration
    const transitRatio = TRANSIT_RATIOS[commuteMode][vec];
    const cTransit = ambientPm25 * transitRatio;

    // d) School / Office concentration
    const cWorkSchool = ambientPm25 * (vec === 'low' ? 0.35 : vec === 'central' ? 0.52 : 0.70);

    // 4. Inhalation rates for activity levels
    const irSleep = INHALATION_RATES[member.ageGroup].sleep[vec];
    const irSedentary = INHALATION_RATES[member.ageGroup].sedentary[vec];
    const irLight = INHALATION_RATES[member.ageGroup].light[vec];

    // 5. Inhaled doses per segment (ug = C * IR * dt)
    const doseSleep = cSleep * irSleep * sleepHours;
    const doseHomeDay = cHomeDay * irLight * homeAwakeHours;
    const doseCommute = cTransit * irLight * (2 * commuteHours);
    const doseWorkSchool = cWorkSchool * irSedentary * workSchoolHours;

    const totalDose = doseSleep + doseHomeDay + doseCommute + doseWorkSchool;

    // Reference dose at WHO 24h guideline (15 ug/m3 continuous)
    const whoRefDose = 15.0 * (irSleep * sleepHours + irLight * homeAwakeHours + irLight * (2 * commuteHours) + irSedentary * workSchoolHours);

    // Time-weighted mean concentration
    const meanConc = (cSleep * sleepHours + cHomeDay * homeAwakeHours + cTransit * (2 * commuteHours) + cWorkSchool * workSchoolHours) / 24.0;

    return {
      totalDose,
      whoRefDose,
      meanConc,
      segments: {
        sleep: { c: cSleep, ir: irSleep, dose: doseSleep, hours: sleepHours },
        homeDay: { c: cHomeDay, ir: irLight, dose: doseHomeDay, hours: homeAwakeHours },
        commute: { c: cTransit, ir: irLight, dose: doseCommute, hours: 2 * commuteHours },
        workSchool: { c: cWorkSchool, ir: irSedentary, dose: doseWorkSchool, hours: workSchoolHours },
      },
    };
  });

  const low = resultsByVector[0];
  const central = resultsByVector[1];
  const high = resultsByVector[2];

  // Assemble RangeValues
  const doseUgd: RangeValue = {
    low: Math.round(low.totalDose * 10) / 10,
    central: Math.round(central.totalDose * 10) / 10,
    high: Math.round(high.totalDose * 10) / 10,
  };

  const exposureRatio: RangeValue = {
    low: Math.round((low.totalDose / low.whoRefDose) * 10) / 10,
    central: Math.round((central.totalDose / central.whoRefDose) * 10) / 10,
    high: Math.round((high.totalDose / high.whoRefDose) * 10) / 10,
  };

  const timeWeightedMeanConc: RangeValue = {
    low: Math.round(low.meanConc),
    central: Math.round(central.meanConc),
    high: Math.round(high.meanConc),
  };

  const cigaretteEquivalent: RangeValue = {
    low: Math.round((low.meanConc / 22.0) * 10) / 10,
    central: Math.round((central.meanConc / 22.0) * 10) / 10,
    high: Math.round((high.meanConc / 22.0) * 10) / 10,
  };

  // Build segments array
  const segments: SegmentDoseContribution[] = [
    {
      name: 'Bedroom (Sleep)',
      durationHours: central.segments.sleep.hours,
      concentrationUgM3: { low: Math.round(low.segments.sleep.c), central: Math.round(central.segments.sleep.c), high: Math.round(high.segments.sleep.c) },
      inhalationRateM3h: { low: low.segments.sleep.ir, central: central.segments.sleep.ir, high: high.segments.sleep.ir },
      doseUgd: { low: Math.round(low.segments.sleep.dose), central: Math.round(central.segments.sleep.dose), high: Math.round(high.segments.sleep.dose) },
      percentOfTotal: Math.round((central.segments.sleep.dose / central.totalDose) * 100),
    },
    {
      name: 'Home Daytime',
      durationHours: central.segments.homeDay.hours,
      concentrationUgM3: { low: Math.round(low.segments.homeDay.c), central: Math.round(central.segments.homeDay.c), high: Math.round(high.segments.homeDay.c) },
      inhalationRateM3h: { low: low.segments.homeDay.ir, central: central.segments.homeDay.ir, high: high.segments.homeDay.ir },
      doseUgd: { low: Math.round(low.segments.homeDay.dose), central: Math.round(central.segments.homeDay.dose), high: Math.round(high.segments.homeDay.dose) },
      percentOfTotal: Math.round((central.segments.homeDay.dose / central.totalDose) * 100),
    },
    {
      name: `Commute (${commuteMode.replace('_', ' ')})`,
      durationHours: central.segments.commute.hours,
      concentrationUgM3: { low: Math.round(low.segments.commute.c), central: Math.round(central.segments.commute.c), high: Math.round(high.segments.commute.c) },
      inhalationRateM3h: { low: low.segments.commute.ir, central: central.segments.commute.ir, high: high.segments.commute.ir },
      doseUgd: { low: Math.round(low.segments.commute.dose), central: Math.round(central.segments.commute.dose), high: Math.round(high.segments.commute.dose) },
      percentOfTotal: Math.round((central.segments.commute.dose / central.totalDose) * 100),
    },
    {
      name: member.ageGroup === 'child' ? 'School' : 'Office / Work',
      durationHours: central.segments.workSchool.hours,
      concentrationUgM3: { low: Math.round(low.segments.workSchool.c), central: Math.round(central.segments.workSchool.c), high: Math.round(high.segments.workSchool.c) },
      inhalationRateM3h: { low: low.segments.workSchool.ir, central: central.segments.workSchool.ir, high: high.segments.workSchool.ir },
      doseUgd: { low: Math.round(low.segments.workSchool.dose), central: Math.round(central.segments.workSchool.dose), high: Math.round(high.segments.workSchool.dose) },
      percentOfTotal: Math.round((central.segments.workSchool.dose / central.totalDose) * 100),
    },
  ];

  return {
    memberAlias: member.nameAlias,
    ageGroup: member.ageGroup,
    doseUgd,
    exposureRatio,
    timeWeightedMeanConc,
    cigaretteEquivalent,
    segments,
    whoGuidelineDoseRef: Math.round(central.whoRefDose * 10) / 10,
  };
}
