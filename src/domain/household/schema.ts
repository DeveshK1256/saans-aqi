/**
 * Saans Household Profile Zod Validation Schemas
 * Enforces SEC-04 (All input endpoints validate with zod)
 */

import { z } from 'zod';

export const HealthFlagsSchema = z.object({
  hasAsthma: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  hasCardiovascularCondition: z.boolean().default(false),
  hasRespiratoryCondition: z.boolean().default(false),
});

export const HouseholdMemberSchema = z.object({
  id: z.string().uuid().optional(),
  nameAlias: z
    .string()
    .min(1, 'Name alias is required')
    .max(50, 'Alias max 50 chars')
    .regex(/^[a-zA-Z0-9\s\-'.()]+$/, 'Name alias must contain only alphanumeric characters, spaces, hyphens, periods, and parentheses'),
  ageGroup: z.enum(['infant', 'toddler', 'child', 'adult', 'elderly']),
  ageYears: z.number().int().min(0).max(120),
  healthFlags: HealthFlagsSchema,
  activityPattern: z.enum(['mostly_indoor', 'hybrid', 'outdoor_worker']).default('hybrid'),
  commuteMode: z.enum(['walk', 'bike_scooter', 'auto_rickshaw', 'metro_train', 'car_ac', 'bus']).default('bike_scooter'),
  commuteDurationMinutes: z.number().int().min(0).max(360).default(30),
});

export const HouseholdConsentSchema = z.object({
  grantedAt: z.string().datetime().default(() => new Date().toISOString()),
  dataProcessingAgreed: z.literal(true, {
    errorMap: () => ({ message: 'Data processing agreement under DPDP Act 2023 is required' }),
  }),
  dpdpVersion: z.literal('2023').default('2023'),
  analyticsOptIn: z.boolean().default(false),
  alertNotificationsOptIn: z.boolean().default(true),
});

export const HouseholdProfileInputSchema = z.object({
  locality: z.string().min(2, 'Locality is required').max(100),
  city: z.string().min(2, 'City is required').max(100),
  gridCell: z.string().regex(/^-?\d{1,3}\.\d{2},-?\d{1,3}\.\d{2}$/, 'Invalid grid cell format (lat,lon)'),
  homeType: z.enum(['apartment', 'independent_house', 'slum_informal']).default('apartment'),
  floor: z.number().int().min(0).max(100).default(1),
  windowSealing: z.enum(['tight', 'standard', 'leaky_unsealed']).default('standard'),
  ventilationHabit: z.enum(['morning_open', 'afternoon_open', 'always_closed', 'always_open']).default('morning_open'),
  hasAc: z.boolean().default(false),
  hasPurifier: z.boolean().default(false),
  purifierCount: z.number().int().min(0).max(10).default(0),
  purifierRoom: z.enum(['bedroom', 'living_room', 'whole_house', 'none']).default('none'),
  kitchenFuel: z.enum(['lpg_piped', 'induction', 'wood_kerosene_chulha']).default('lpg_piped'),
  hasKitchenChimney: z.boolean().default(false),
  hasIncenseOrCoils: z.boolean().default(false),
  hasPets: z.boolean().default(false),
  hasSmokers: z.boolean().default(false),
  members: z.array(HouseholdMemberSchema).min(1, 'At least one household member must be specified'),
  consent: HouseholdConsentSchema,
});

export type HouseholdProfileInput = z.infer<typeof HouseholdProfileInputSchema>;
export type HouseholdMemberInput = z.infer<typeof HouseholdMemberSchema>;
