import { describe, it, expect } from 'vitest';
import {
  computeExposure,
  computeVulnerabilityScore,
  indoorConcentration,
  purifierFactor,
  INHALATION_RATES,
  CIGARETTE_EQUIVALENT_DIVISOR,
  type MemberProfile,
  type HomeProfile,
} from '../../src/lib/exposure-engine';

// --- Test fixtures ---
const priya: MemberProfile = {
  id: 'priya-001',
  ageBand: '6_10',
  conditions: ['asthma'],
  commuteMode: 'auto_rickshaw',
  commuteMinutesOneWay: 20,
};

const meera: MemberProfile = {
  id: 'meera-001',
  ageBand: '31_50',
  conditions: [],
  commuteMode: 'wfh',
  commuteMinutesOneWay: 0,
};

const kamla: MemberProfile = {
  id: 'kamla-001',
  ageBand: '66_75',
  conditions: ['copd'],
  commuteMode: 'na',
  commuteMinutesOneWay: 0,
};

const homeDefault: HomeProfile = {
  homeType: 'apartment',
  ventilation: 'windows',
  hasPurifier: false,
  purifierCadrM3h: 0,
  windowsOpen: false,
};

const homeWithPurifier: HomeProfile = {
  ...homeDefault,
  hasPurifier: true,
  purifierCadrM3h: 300,
};

// --- Unit tests ---

describe('Exposure Engine', () => {
  describe('Inhalation Rates', () => {
    it('should have rates for all age bands', () => {
      const bands = ['0_1', '1_5', '6_10', '11_17', '18_30', '31_50', '51_65', '66_75', '76_plus'];
      for (const band of bands) {
        expect(INHALATION_RATES[band]).toBeGreaterThan(0);
      }
    });

    it('child 6-10 should be 10.1 m³/day per EPA EFH', () => {
      expect(INHALATION_RATES['6_10']).toBe(10.1);
    });

    it('adult 31-50 should be 16.0 m³/day per EPA EFH', () => {
      expect(INHALATION_RATES['31_50']).toBe(16.0);
    });
  });

  describe('Purifier Factor', () => {
    it('should return 0 when no purifier', () => {
      expect(purifierFactor(false, 0)).toBe(0);
    });

    it('should return a value between 0 and 1 for a valid CADR', () => {
      const factor = purifierFactor(true, 300);
      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThan(1);
    });

    it('higher CADR should give higher purifier factor', () => {
      const low = purifierFactor(true, 100);
      const high = purifierFactor(true, 500);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('Indoor Concentration', () => {
    it('should be less than ambient when windows closed, no purifier', () => {
      const c = indoorConcentration(200, homeDefault);
      expect(c).toBeLessThan(200);
      expect(c).toBeGreaterThan(0);
    });

    it('should be higher with windows open than closed', () => {
      const closed = indoorConcentration(200, { ...homeDefault, windowsOpen: false });
      const open = indoorConcentration(200, { ...homeDefault, windowsOpen: true });
      expect(open).toBeGreaterThan(closed);
    });

    it('should be lower with purifier than without', () => {
      const without = indoorConcentration(200, homeDefault);
      const withPurifier = indoorConcentration(200, homeWithPurifier);
      expect(withPurifier).toBeLessThan(without);
    });

    it('should be 0 when ambient is 0', () => {
      expect(indoorConcentration(0, homeDefault)).toBe(0);
    });
  });

  describe('Vulnerability Score', () => {
    it('healthy adult should score 1.0', () => {
      expect(computeVulnerabilityScore(meera)).toBe(1.0);
    });

    it('asthmatic child should score higher than healthy adult', () => {
      const priyaScore = computeVulnerabilityScore(priya);
      const meeraScore = computeVulnerabilityScore(meera);
      expect(priyaScore).toBeGreaterThan(meeraScore);
    });

    it('Priya (6-10, asthma) should score 1.5 × 1.5 = 2.25', () => {
      expect(computeVulnerabilityScore(priya)).toBe(2.25);
    });

    it('Kamla (66-75, COPD) should score 1.6 × 1.7 = 2.72', () => {
      expect(computeVulnerabilityScore(kamla)).toBeCloseTo(2.72, 1);
    });

    it('score should always be >= 1.0', () => {
      // Property-based: test many combinations
      const bands = ['0_1', '1_5', '6_10', '11_17', '18_30', '31_50', '51_65', '66_75', '76_plus'];
      const conditions = [[], ['asthma'], ['copd'], ['heart_disease'], ['pregnant'], ['allergies']];
      for (const band of bands) {
        for (const conds of conditions) {
          const score = computeVulnerabilityScore({
            id: 'test', ageBand: band, conditions: conds,
            commuteMode: 'wfh', commuteMinutesOneWay: 0,
          });
          expect(score).toBeGreaterThanOrEqual(1.0);
        }
      }
    });
  });

  describe('Exposure Computation', () => {
    it('dose should be non-negative for any valid input', () => {
      const result = computeExposure(priya, homeDefault, 200);
      expect(result.doseUg).toBeGreaterThanOrEqual(0);
    });

    it('dose should increase monotonically with ambient concentration', () => {
      const dose100 = computeExposure(priya, homeDefault, 100).doseUg;
      const dose200 = computeExposure(priya, homeDefault, 200).doseUg;
      const dose400 = computeExposure(priya, homeDefault, 400).doseUg;
      expect(dose200).toBeGreaterThan(dose100);
      expect(dose400).toBeGreaterThan(dose200);
    });

    it('purifier should lower dose', () => {
      const without = computeExposure(priya, homeDefault, 200).doseUg;
      const withPurifier = computeExposure(priya, homeWithPurifier, 200).doseUg;
      expect(withPurifier).toBeLessThan(without);
    });

    it('dose at 0 ambient should be 0', () => {
      const result = computeExposure(priya, homeDefault, 0);
      expect(result.doseUg).toBe(0);
    });

    it('cigarette equivalent should be ambient / 22', () => {
      const result = computeExposure(priya, homeDefault, 220);
      expect(result.cigaretteEquiv).toBe(10.0);
    });

    it('microenvironments should sum to total dose', () => {
      const result = computeExposure(priya, homeDefault, 200);
      const sum = result.microenvironments.reduce((s, m) => s + m.doseContributionUg, 0);
      expect(Math.abs(sum - result.doseUg)).toBeLessThan(0.2); // rounding tolerance
    });

    it('WFH member should have no commute microenvironment', () => {
      const result = computeExposure(meera, homeDefault, 200);
      const commute = result.microenvironments.find(m => m.name === 'commute');
      expect(commute).toBeUndefined();
    });

    it('commuting member should have commute microenvironment', () => {
      const result = computeExposure(priya, homeDefault, 200);
      const commute = result.microenvironments.find(m => m.name === 'commute');
      expect(commute).toBeDefined();
      expect(commute!.hours).toBeCloseTo(40 / 60, 1); // 20 min × 2 / 60
    });
  });
});
