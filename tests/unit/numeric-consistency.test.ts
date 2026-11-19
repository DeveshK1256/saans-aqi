import { describe, expect, it } from 'vitest';
import { substitutePlaceholders, verifyNumericConsistency } from '../../src/ai/placeholder-substitutor';
import { ScoredAction } from '../../src/domain/recommendations/types';

describe('Numeric-Placeholder Technique & Consistency Verifier (Part 5.1)', () => {
  const mockAction: ScoredAction = {
    action: {
      id: 'bedroom_purifier',
      title: 'Bedroom Purifier',
      description: 'Run purifier in bedroom',
      category: 'indoor_filtration',
      effort: 'low',
      estimatedCostInr: 2150,
      targetMicroenvironment: 'sleep',
      exposureReductionPct: { low: 65, central: 78, high: 88 },
      citation: 'Nazaroff (2004)',
      verified: true,
    },
    rank: 1,
    targetMemberId: 'm1',
    targetMemberName: 'Aarav',
    doseAvoidedUgd: { low: 42.0, central: 58.3, high: 76.5 },
    doseReductionPct: 33.8,
    co2AvoidedGrams: { low: 800, central: 1120, high: 1400 },
    effortWeight: 1.0,
    compositeScore: 58.3,
    headline: 'Operating bedroom purifier saves {{delta_dose_ug}} ug/day (-{{pct_saved}}%)',
    steps: ['Seal bedroom', 'Run for 8 hours'],
    whyThis: {
      ruleTriggered: 'RULE_SLEEP',
      targetMember: { ageGroup: 'child', hasAsthma: true, hasVulnerability: true },
      ambientPm25: 180,
      dataAgeMinutes: 20,
      confidenceScore: 0.9,
      isUnsure: false,
      scientificCitation: 'Nazaroff (2004)',
      verified: true,
      isEstimate: false,
    },
  };

  it('correctly substitutes placeholders with domain computed numbers', () => {
    const rawTemplate = 'For {{target_member}}, this cuts daily dose by {{delta_dose_ug}} µg (saving {{pct_saved}}%).';
    const substituted = substitutePlaceholders(rawTemplate, {
      action: mockAction,
      vulnerableMemberName: 'Aarav',
    });

    expect(substituted).toBe('For Aarav, this cuts daily dose by 58.3 µg (saving 33.8%).');
  });

  it('verifies 100% numeric consistency when all numbers match computed inputs', () => {
    const validText = 'For Aarav, this cuts daily dose by 58.3 µg (saving 33.8%) with ambient AQI base of 180.';
    const check = verifyNumericConsistency(validText, {
      action: mockAction,
      vulnerableMemberName: 'Aarav',
    });

    expect(check.isConsistent).toBe(true);
    expect(check.violations.length).toBe(0);
  });

  it('flags a violation when an unauthorized or hallucinated number is injected', () => {
    const hallucinatedText = 'For Aarav, this magical device reduces exposure by 999.9 µg and 888%';
    const check = verifyNumericConsistency(hallucinatedText, {
      action: mockAction,
      vulnerableMemberName: 'Aarav',
    });

    expect(check.isConsistent).toBe(false);
    expect(check.violations.length).toBeGreaterThan(0);
    expect(check.violations[0]).toContain('999.9');
  });
});
