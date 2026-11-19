import { describe, it, expect } from 'vitest';
import { simulateWhatIf } from '../../src/domain/exposure/what-if';
import { HouseholdMember, HouseholdProfile } from '../../src/domain/household/types';

describe('What-If Simulator & Two-Way Impact Tests (Part 3.4 & 3.5)', () => {
  const priyaChild: HouseholdMember = {
    id: 'mem_child_6yo',
    nameAlias: 'Aarav (Child)',
    ageGroup: 'child',
    ageYears: 6,
    healthFlags: { hasAsthma: true, isPregnant: false, hasCardiovascularCondition: false, hasRespiratoryCondition: true },
    activityPattern: 'mostly_indoor',
    commuteMode: 'bike_scooter',
    commuteDurationMinutes: 15,
  };

  const priyaHome: HouseholdProfile = {
    id: 'hh_pune_priya',
    userId: 'usr_priya',
    locality: 'Shivajinagar',
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
    members: [priyaChild],
    consent: {
      grantedAt: new Date().toISOString(),
      dataProcessingAgreed: true,
      dpdpVersion: '2023',
      analyticsOptIn: false,
      alertNotificationsOptIn: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('NON-NEGOTIABLE INVARIANT: Zero-change scenario returns exactly zero delta', () => {
    const result = simulateWhatIf({
      member: priyaChild,
      profile: priyaHome,
      ambientPm25: 140,
      overrides: {}, // empty overrides
    });

    expect(result.isZeroChange).toBe(true);
    expect(result.deltaDoseUgd.central).toBe(0.0);
    expect(result.deltaDoseUgd.low).toBe(0.0);
    expect(result.deltaDoseUgd.high).toBe(0.0);
    expect(result.deltaPercent).toBe(0.0);
    expect(result.emissionsAvoided.co2Grams.central).toBe(0.0);
    expect(result.emissionsAvoided.pmGrams.central).toBe(0.0);
  });

  it('demonstrates significant dose reduction when bedroom purifier is added overnight (8 hours)', () => {
    const result = simulateWhatIf({
      member: priyaChild,
      profile: priyaHome,
      ambientPm25: 140,
      overrides: {
        purifierHours: 8,
        purifierCadrM3h: 250,
      },
    });

    expect(result.isZeroChange).toBe(false);
    expect(result.deltaDoseUgd.central).toBeGreaterThan(0);
    // Bedroom air cleaning during 9.5 hours of sleep should cut daily dose by ~30-50%
    expect(result.deltaPercent).toBeGreaterThan(25.0);
    expect(result.deltaPercent).toBeLessThan(60.0);
    expect(result.scenarioDose.central).toBeLessThan(result.baselineDose.central);
  });

  it('two-way impact: switching commute from bike to metro cuts exposure and saves CO2', () => {
    const result = simulateWhatIf({
      member: priyaChild,
      profile: priyaHome,
      ambientPm25: 140,
      overrides: {
        commuteMode: 'metro_train',
        roundTripKm: 20.0,
      },
    });

    expect(result.deltaDoseUgd.central).toBeGreaterThan(0);
    // 20 km * (72 - 16 g CO2/km) = 1120 grams CO2 avoided
    expect(result.emissionsAvoided.co2Grams.central).toBe(1120);
    expect(result.emissionsAvoided.pmGrams.central).toBeGreaterThan(0.5);
  });

  it('EFF-03: What-if recomputation executes in < 10 ms (budget: 50 ms in browser / Node)', () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      simulateWhatIf({
        member: priyaChild,
        profile: priyaHome,
        ambientPm25: 140,
        overrides: { purifierHours: 8, commuteMode: 'metro_train' },
      });
    }
    const duration = performance.now() - start;
    const avg = duration / 20;

    expect(avg).toBeLessThan(10.0); // well under 50 ms EFF-03
  });
});
