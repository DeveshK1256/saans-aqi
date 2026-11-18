/**
 * Saans Exposure Engine
 * Deterministic computation of estimated PM2.5 dose per person.
 *
 * License: MIT (see /LICENSE)
 * Source: US EPA Exposure Factors Handbook, 2011 Edition, Chapter 6
 *
 * IMPORTANT: This module is shared between server (daily computation)
 * and client (What-If Simulator). It must have ZERO external dependencies
 * and run in < 100ms on a low-end device.
 */

// --- Age-banded inhalation rates (m³/day, mean) ---
// Source: US EPA EFH 2011, Chapter 6, Table 6-1
export const INHALATION_RATES: Record<string, number> = {
  '0_1': 3.6,
  '1_5': 8.1,    // average of 1-2 (8.1) and 2-3 (9.2) and 3-6 (10.1) → using 1-2 as lower bound for the band
  '6_10': 10.1,  // 3-6 yr = 10.1; using this for 6-10 band (conservative, actual 6-11 = 12.0)
  '11_17': 15.2, // 11-16 yr = 15.2
  '18_30': 16.3, // 16-21 yr = 16.3
  '31_50': 16.0, // 31-41 yr = 16.0
  '51_65': 15.7, // 51-61 yr = 15.7
  '66_75': 14.2, // 61-71 yr = 14.2
  '76_plus': 12.9, // 71-81 yr = 12.9
};

// --- Infiltration factors ---
// Source: EPA I-BEAM model, limited India-specific data (DEC-013)
export const INFILTRATION_FACTORS: Record<string, { closed: number; open: number }> = {
  apartment:    { closed: 0.4, open: 0.85 },
  independent:  { closed: 0.5, open: 0.95 },
  row_house:    { closed: 0.45, open: 0.9 },
  informal:     { closed: 0.8, open: 0.95 },
};

// --- Commute exposure factors ---
// Ratio of personal exposure to ambient concentration by transport mode
export const COMMUTE_FACTORS: Record<string, number> = {
  walk: 1.2,
  bicycle: 1.3,
  two_wheeler: 1.5,
  auto_rickshaw: 1.4,
  car: 0.5,         // windows up, AC on
  bus: 0.8,
  metro: 0.3,
  wfh: 0,           // no commute exposure
  school_bus: 0.6,
  na: 0,
};

// --- Vulnerability scoring ---
export const AGE_VULNERABILITY: Record<string, number> = {
  '0_1': 2.0,
  '1_5': 1.8,
  '6_10': 1.5,
  '11_17': 1.2,
  '18_30': 1.0,
  '31_50': 1.0,
  '51_65': 1.3,
  '66_75': 1.6,
  '76_plus': 1.9,
};

export const CONDITION_MULTIPLIERS: Record<string, number> = {
  asthma: 1.5,
  copd: 1.7,
  heart_disease: 1.4,
  pregnant: 1.6,
  allergies: 1.2,
};

// --- Cigarette equivalent ---
// Source: Berkeley Earth (Muller & Muller)
// 22 µg/m³ of 24-h PM2.5 ≈ 1 cigarette/day
export const CIGARETTE_EQUIVALENT_DIVISOR = 22;

// --- Types ---
export interface MemberProfile {
  id: string;
  ageBand: string;
  conditions: string[];
  commuteMode: string;
  commuteMinutesOneWay: number;
}

export interface HomeProfile {
  homeType: string;
  ventilation: string;
  hasPurifier: boolean;
  purifierCadrM3h: number;
  windowsOpen: boolean;
}

export interface Microenvironment {
  name: string;
  hours: number;
  concentration: number;
  doseContributionUg: number;
}

export interface ExposureResult {
  memberId: string;
  doseUg: number;
  cigaretteEquiv: number;
  microenvironments: Microenvironment[];
  vulnerabilityScore: number;
}

// --- Core computation ---

/**
 * Compute the purifier reduction factor.
 * Assumes a standard room volume of 30 m³ for simplicity.
 * Purifier efficiency = 1 - (room_volume * ACH_natural) / (room_volume * ACH_natural + CADR)
 * Simplified: efficiency = CADR / (CADR + room_volume * ACH_natural)
 * With ACH_natural ≈ 1.0 for a typical room.
 */
export function purifierFactor(hasPurifier: boolean, cadrM3h: number): number {
  if (!hasPurifier || cadrM3h <= 0) return 0;
  const roomVolume = 30; // m³, standard room
  const achNatural = 1.0; // air changes per hour, natural
  return cadrM3h / (cadrM3h + roomVolume * achNatural);
}

/**
 * Get the indoor concentration estimate.
 * C_indoor = C_ambient × infiltration_factor × (1 - purifier_factor)
 */
export function indoorConcentration(
  ambientPm25: number,
  home: HomeProfile
): number {
  const infFactors = INFILTRATION_FACTORS[home.homeType] || INFILTRATION_FACTORS.apartment;
  const infFactor = home.windowsOpen ? infFactors.open : infFactors.closed;
  const purFactor = purifierFactor(home.hasPurifier, home.purifierCadrM3h);
  return ambientPm25 * infFactor * (1 - purFactor);
}

/**
 * Compute vulnerability score for a member.
 */
export function computeVulnerabilityScore(member: MemberProfile): number {
  const ageFactor = AGE_VULNERABILITY[member.ageBand] || 1.0;
  let conditionFactor = 1.0;
  for (const condition of member.conditions) {
    conditionFactor *= CONDITION_MULTIPLIERS[condition] || 1.0;
  }
  return ageFactor * conditionFactor;
}

/**
 * Compute estimated daily PM2.5 dose for a single member.
 *
 * dose_µg = Σ_env ( C_env × IR_age × t_hours / 24 )
 *
 * Microenvironments:
 * - Sleep (indoor, 8h default)
 * - Commute (outdoor, from profile)
 * - Daytime indoor (remaining hours)
 */
export function computeExposure(
  member: MemberProfile,
  home: HomeProfile,
  ambientPm25: number
): ExposureResult {
  const ir = INHALATION_RATES[member.ageBand] || 16.0; // default to adult
  const commuteHours = (member.commuteMinutesOneWay * 2) / 60; // round trip
  const sleepHours = 8;
  const indoorHours = 24 - sleepHours - commuteHours;

  const cIndoor = indoorConcentration(ambientPm25, home);
  const commuteFactor = COMMUTE_FACTORS[member.commuteMode] || 0;
  const cCommute = ambientPm25 * commuteFactor;

  const microenvironments: Microenvironment[] = [];

  // Sleep (indoor, windows assumed closed during sleep)
  const sleepConc = ambientPm25 * (INFILTRATION_FACTORS[home.homeType]?.closed || 0.4) *
    (1 - purifierFactor(home.hasPurifier, home.purifierCadrM3h));
  const sleepDose = sleepConc * ir * (sleepHours / 24);
  microenvironments.push({
    name: 'sleep_indoor',
    hours: sleepHours,
    concentration: Math.round(sleepConc * 10) / 10,
    doseContributionUg: Math.round(sleepDose * 10) / 10,
  });

  // Commute
  if (commuteHours > 0 && commuteFactor > 0) {
    const commuteDose = cCommute * ir * (commuteHours / 24);
    microenvironments.push({
      name: 'commute',
      hours: Math.round(commuteHours * 100) / 100,
      concentration: Math.round(cCommute * 10) / 10,
      doseContributionUg: Math.round(commuteDose * 10) / 10,
    });
  }

  // Daytime indoor
  const daytimeDose = cIndoor * ir * (indoorHours / 24);
  microenvironments.push({
    name: 'indoor_daytime',
    hours: Math.round(indoorHours * 100) / 100,
    concentration: Math.round(cIndoor * 10) / 10,
    doseContributionUg: Math.round(daytimeDose * 10) / 10,
  });

  const totalDose = microenvironments.reduce((sum, m) => sum + m.doseContributionUg, 0);

  return {
    memberId: member.id,
    doseUg: Math.round(totalDose * 10) / 10,
    cigaretteEquiv: Math.round((ambientPm25 / CIGARETTE_EQUIVALENT_DIVISOR) * 10) / 10,
    microenvironments,
    vulnerabilityScore: computeVulnerabilityScore(member),
  };
}
