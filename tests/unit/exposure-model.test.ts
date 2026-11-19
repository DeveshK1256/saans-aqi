import { describe, it, expect } from 'vitest';
import { calculatePersonalExposure } from '../../src/domain/exposure/exposure-engine';
import { HouseholdMember, HouseholdProfile } from '../../src/domain/household/types';

describe('Personal Exposure Engine & Golden Math Tests (Part 3.2 & SCI-03)', () => {
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

  it('calculates physical dose with verified bounds: low <= central <= high', () => {
    const ambientPm25 = 120; // 120 ug/m3 ambient day
    const result = calculatePersonalExposure({
      member: priyaChild,
      profile: priyaHome,
      ambientPm25,
    });

    // Invariant: low <= central <= high across all ranges
    expect(result.doseUgd.low).toBeLessThanOrEqual(result.doseUgd.central);
    expect(result.doseUgd.central).toBeLessThanOrEqual(result.doseUgd.high);

    expect(result.exposureRatio.low).toBeLessThanOrEqual(result.exposureRatio.central);
    expect(result.exposureRatio.central).toBeLessThanOrEqual(result.exposureRatio.high);

    expect(result.timeWeightedMeanConc.low).toBeLessThanOrEqual(result.timeWeightedMeanConc.central);
    expect(result.timeWeightedMeanConc.central).toBeLessThanOrEqual(result.timeWeightedMeanConc.high);

    // Dose must be positive physical quantity
    expect(result.doseUgd.central).toBeGreaterThan(0);
    expect(result.exposureRatio.central).toBeGreaterThan(1.0); // 120 ug/m3 is well above WHO 15 ug/m3 guideline
  });

  it('exhibits strict monotonicity: higher ambient pollution yields strictly higher daily dose', () => {
    const doseCleanDay = calculatePersonalExposure({ member: priyaChild, profile: priyaHome, ambientPm25: 30 });
    const doseModerateDay = calculatePersonalExposure({ member: priyaChild, profile: priyaHome, ambientPm25: 100 });
    const doseSevereDay = calculatePersonalExposure({ member: priyaChild, profile: priyaHome, ambientPm25: 350 });

    expect(doseModerateDay.doseUgd.central).toBeGreaterThan(doseCleanDay.doseUgd.central);
    expect(doseSevereDay.doseUgd.central).toBeGreaterThan(doseModerateDay.doseUgd.central);
  });

  it('benchmark: single-day exposure calculation executes in < 5 ms (budget: 20 ms for EFF-04)', () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      calculatePersonalExposure({ member: priyaChild, profile: priyaHome, ambientPm25: 150 });
    }
    const duration = performance.now() - start;
    const avgPerRun = duration / 20;

    expect(avgPerRun).toBeLessThan(5.0); // well under 20 ms EFF-04 criteria
  });
});
