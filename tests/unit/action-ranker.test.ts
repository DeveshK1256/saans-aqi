import { describe, expect, it } from 'vitest';
import { findMostVulnerableMember, rankRecommendations } from '../../src/domain/recommendations/action-ranker';
import { HouseholdMember, HouseholdProfile } from '../../src/domain/household/types';

describe('Saans Action Ranker (F6)', () => {
  const priyaChild: HouseholdMember = {
    id: 'm_priya_child',
    nameAlias: 'Aarav',
    ageGroup: 'child',
    ageYears: 6,
    healthFlags: {
      hasAsthma: true,
      isPregnant: false,
      hasCardiovascularCondition: false,
      hasRespiratoryCondition: false,
    },
    activityPattern: 'hybrid',
    commuteMode: 'bike_scooter',
    commuteDurationMinutes: 30,
  };

  const priyaAdult: HouseholdMember = {
    id: 'm_priya_adult',
    nameAlias: 'Priya',
    ageGroup: 'adult',
    ageYears: 34,
    healthFlags: {
      hasAsthma: false,
      isPregnant: false,
      hasCardiovascularCondition: false,
      hasRespiratoryCondition: false,
    },
    activityPattern: 'hybrid',
    commuteMode: 'bike_scooter',
    commuteDurationMinutes: 30,
  };

  const priyaProfile: HouseholdProfile = {
    id: 'hh_priya',
    userId: 'u_priya',
    city: 'Pune',
    locality: 'Kothrud',
    gridCell: '18.52,73.86',
    homeType: 'apartment',
    floor: 3,
    windowSealing: 'standard',
    ventilationHabit: 'morning_open',
    hasAc: false,
    hasPurifier: false,
    purifierCount: 0,
    purifierRoom: 'none',
    kitchenFuel: 'lpg_piped',
    hasKitchenChimney: true,
    hasIncenseOrCoils: false,
    hasPets: false,
    hasSmokers: false,
    members: [priyaAdult, priyaChild],
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

  it('correctly identifies Priya\'s asthmatic child as the most vulnerable member', () => {
    const { member, reason } = findMostVulnerableMember(priyaProfile.members);
    expect(member.id).toBe('m_priya_child');
    expect(reason).toContain('chronic asthma');
  });

  it('ranks top recommendations with physical dose reductions and provenance', () => {
    const result = rankRecommendations({
      householdId: 'hh_priya',
      profile: priyaProfile,
      ambientPm25: 180,
    });

    expect(result.vulnerableMemberName).toBe('Aarav');
    expect(result.topActions.length).toBeGreaterThanOrEqual(2);

    // Verify bedroom purifier is top-ranked
    const purifierAction = result.topActions.find(a => a.action.id === 'bedroom_purifier');
    expect(purifierAction).toBeDefined();
    expect(purifierAction!.doseAvoidedUgd.central).toBeGreaterThan(30);
    expect(purifierAction!.doseReductionPct).toBeGreaterThan(20);

    // Verify Provenance
    expect(purifierAction!.whyThis.ruleTriggered).toBe('RULE_UNFILTERED_SLEEP_HOURS');
    expect(purifierAction!.whyThis.scientificCitation).toContain('Nazaroff');
    expect(purifierAction!.whyThis.verified).toBe(true);
  });

  it('evaluates transit switch for road commuter and includes two-way emission deltas', () => {
    const result = rankRecommendations({
      householdId: 'hh_priya',
      profile: priyaProfile,
      ambientPm25: 180,
    });

    const metroAction = result.topActions.find(a => a.action.id === 'commute_metro_shift');
    expect(metroAction).toBeDefined();
    expect(metroAction!.co2AvoidedGrams).toBeDefined();
    expect(metroAction!.co2AvoidedGrams!.central).toBeGreaterThan(1000); // ~1,120 g CO2 for 20 km
  });
});
