import { describe, it, expect } from 'vitest';
import { HouseholdProfileInputSchema } from '../../src/domain/household/schema';

describe('Household Profile Validation & Defaults (F2 & SEC-04)', () => {
  const validPriyaProfile = {
    locality: 'Kothrud / Shivajinagar',
    city: 'Pune',
    gridCell: '18.52,73.86',
    homeType: 'apartment',
    floor: 3,
    windowSealing: 'standard',
    ventilationHabit: 'morning_open',
    hasAc: true,
    hasPurifier: false,
    purifierCount: 0,
    purifierRoom: 'none',
    kitchenFuel: 'lpg_piped',
    hasKitchenChimney: true,
    hasIncenseOrCoils: false,
    hasPets: false,
    hasSmokers: false,
    members: [
      {
        nameAlias: 'Priya',
        ageGroup: 'adult',
        ageYears: 32,
        healthFlags: { hasAsthma: false, isPregnant: false, hasCardiovascularCondition: false, hasRespiratoryCondition: false },
        activityPattern: 'hybrid',
        commuteMode: 'bike_scooter',
        commuteDurationMinutes: 35,
      },
      {
        nameAlias: 'Child (6yo)',
        ageGroup: 'child',
        ageYears: 6,
        healthFlags: { hasAsthma: true, isPregnant: false, hasCardiovascularCondition: false, hasRespiratoryCondition: true },
        activityPattern: 'mostly_indoor',
        commuteMode: 'bike_scooter',
        commuteDurationMinutes: 15,
      },
    ],
    consent: {
      grantedAt: new Date().toISOString(),
      dataProcessingAgreed: true,
      dpdpVersion: '2023',
      analyticsOptIn: false,
      alertNotificationsOptIn: true,
    },
  };

  it('successfully validates complete Priya persona profile', () => {
    const parsed = HouseholdProfileInputSchema.parse(validPriyaProfile);
    expect(parsed.city).toBe('Pune');
    expect(parsed.floor).toBe(3);
    expect(parsed.members.length).toBe(2);
    expect(parsed.members[1].healthFlags.hasAsthma).toBe(true);
  });

  it('rejects invalid gridCell format', () => {
    const invalid = { ...validPriyaProfile, gridCell: 'invalid-grid' };
    expect(() => HouseholdProfileInputSchema.parse(invalid)).toThrowError(/Invalid grid cell format/);
  });

  it('rejects profile with empty members array', () => {
    const invalid = { ...validPriyaProfile, members: [] };
    expect(() => HouseholdProfileInputSchema.parse(invalid)).toThrowError(/At least one household member/);
  });

  it('rejects negative floor or excessive floor bounds', () => {
    const invalidNegative = { ...validPriyaProfile, floor: -1 };
    expect(() => HouseholdProfileInputSchema.parse(invalidNegative)).toThrow();
  });

  it('rejects member with ageYears exceeding 120', () => {
    const invalidAge = {
      ...validPriyaProfile,
      members: [{ ...validPriyaProfile.members[0], ageYears: 150 }],
    };
    expect(() => HouseholdProfileInputSchema.parse(invalidAge)).toThrow();
  });

  it('rejects submission if DPDP dataProcessingAgreed is not true', () => {
    const invalidConsent = {
      ...validPriyaProfile,
      consent: { ...validPriyaProfile.consent, dataProcessingAgreed: false },
    };
    expect(() => HouseholdProfileInputSchema.parse(invalidConsent)).toThrowError(/Data processing agreement/);
  });
});
