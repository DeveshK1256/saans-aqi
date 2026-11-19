/**
 * Saans Household Profile & Health Risk Types
 * Implements Feature F2 & Part 7 (Security and Privacy) of docs/00_MASTER_SPEC.md.
 *
 * Requirements:
 * - Data minimisation: Category health flags, never child medical records or PII
 * - Field-level envelope encryption with Cloud KMS for health flags (GS-12)
 * - 2-minute onboarding support with Indian urban defaults
 */

export type AgeGroup = 'infant' | 'toddler' | 'child' | 'adult' | 'elderly';

export type CommuteMode =
  | 'walk'
  | 'bike_scooter'
  | 'auto_rickshaw'
  | 'metro_train'
  | 'car_ac'
  | 'bus';

export type HomeType = 'apartment' | 'independent_house' | 'slum_informal';

export type WindowSealing = 'tight' | 'standard' | 'leaky_unsealed';

export type VentilationHabit =
  | 'morning_open'
  | 'afternoon_open'
  | 'always_closed'
  | 'always_open';

export type KitchenFuel = 'lpg_piped' | 'induction' | 'wood_kerosene_chulha';

export interface HealthFlags {
  hasAsthma: boolean;
  isPregnant: boolean;
  hasCardiovascularCondition: boolean;
  hasRespiratoryCondition: boolean;
}

export interface HouseholdMember {
  id: string;
  nameAlias: string; // e.g. "Child (Priya)", "Elderly (Dadaji)"
  ageGroup: AgeGroup;
  ageYears: number;
  healthFlags: HealthFlags;
  activityPattern: 'mostly_indoor' | 'hybrid' | 'outdoor_worker';
  commuteMode: CommuteMode;
  commuteDurationMinutes: number;
}

export interface StoredHouseholdMember extends Omit<HouseholdMember, 'healthFlags'> {
  // Stored in database as encrypted envelope ciphertext (kms:v1:iv:ciphertext:tag)
  encryptedHealthFlags: string;
}

export interface HouseholdConsent {
  grantedAt: string;
  dataProcessingAgreed: boolean;
  dpdpVersion: '2023';
  analyticsOptIn: boolean;
  alertNotificationsOptIn: boolean;
}

export interface HouseholdProfile {
  id: string;
  userId: string;
  locality: string;
  city: string;
  gridCell: string; // ~1 km grid cell key (e.g. "18.52,73.86" for Pune)
  homeType: HomeType;
  floor: number;
  windowSealing: WindowSealing;
  ventilationHabit: VentilationHabit;
  hasAc: boolean;
  hasPurifier: boolean;
  purifierCount: number;
  purifierRoom: 'bedroom' | 'living_room' | 'whole_house' | 'none';
  kitchenFuel: KitchenFuel;
  hasKitchenChimney: boolean;
  hasIncenseOrCoils: boolean;
  hasPets: boolean;
  hasSmokers: boolean;
  members: HouseholdMember[];
  consent: HouseholdConsent;
  createdAt: string;
  updatedAt: string;
}

export interface StoredHouseholdProfile extends Omit<HouseholdProfile, 'members'> {
  members: StoredHouseholdMember[];
}
