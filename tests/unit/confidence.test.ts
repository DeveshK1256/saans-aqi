import { describe, it, expect } from 'vitest';
import { assessConfidence } from '../../src/domain/air/confidence';
import { PollutantValues } from '../../src/domain/air/types';

describe('Saans Data Confidence & Staleness Meter Tests', () => {
  const completePollutants: PollutantValues = {
    pm25: 145,
    pm10: 220,
    no2: 45,
    so2: 15,
    co: 1.2,
    o3: 35,
  };

  describe('Data Age Factor (Monotonicity & Thresholds)', () => {
    it('awards 1.0 age score for data under 60 minutes old', () => {
      const c10 = assessConfidence({ ageMinutes: 10, stationDistanceKm: 1.0, pollutants: completePollutants });
      const c60 = assessConfidence({ ageMinutes: 60, stationDistanceKm: 1.0, pollutants: completePollutants });
      expect(c10.factors.dataAgeScore).toBe(1.0);
      expect(c60.factors.dataAgeScore).toBe(1.0);
    });

    it('decreases score monotonically as data ages past 60 minutes', () => {
      const c60 = assessConfidence({ ageMinutes: 60, stationDistanceKm: 1.0, pollutants: completePollutants });
      const c120 = assessConfidence({ ageMinutes: 120, stationDistanceKm: 1.0, pollutants: completePollutants });
      const c180 = assessConfidence({ ageMinutes: 180, stationDistanceKm: 1.0, pollutants: completePollutants });
      const c240 = assessConfidence({ ageMinutes: 240, stationDistanceKm: 1.0, pollutants: completePollutants });

      expect(c60.factors.dataAgeScore).toBeGreaterThan(c120.factors.dataAgeScore);
      expect(c120.factors.dataAgeScore).toBeGreaterThan(c180.factors.dataAgeScore);
      expect(c180.factors.dataAgeScore).toBeGreaterThan(c240.factors.dataAgeScore);
    });

    it('drops dataAgeScore to 0 for readings older than 6 hours (360 min)', () => {
      const c360 = assessConfidence({ ageMinutes: 360, stationDistanceKm: 1.0, pollutants: completePollutants });
      const c500 = assessConfidence({ ageMinutes: 500, stationDistanceKm: 1.0, pollutants: completePollutants });
      expect(c360.factors.dataAgeScore).toBe(0.0);
      expect(c500.factors.dataAgeScore).toBe(0.0);
    });
  });

  describe('Station Distance Factor', () => {
    it('awards 1.0 distance score for stations within 2 km', () => {
      const c1 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 0.8, pollutants: completePollutants });
      const c2 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 2.0, pollutants: completePollutants });
      expect(c1.factors.distanceScore).toBe(1.0);
      expect(c2.factors.distanceScore).toBe(1.0);
    });

    it('decreases score monotonically with increasing distance', () => {
      const c5 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 5.0, pollutants: completePollutants });
      const c10 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 10.0, pollutants: completePollutants });
      const c20 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 20.0, pollutants: completePollutants });

      expect(c5.factors.distanceScore).toBeGreaterThan(c10.factors.distanceScore);
      expect(c10.factors.distanceScore).toBeGreaterThan(c20.factors.distanceScore);
    });

    it('drops distance score to 0.0 at or beyond 25 km', () => {
      const c25 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 25.0, pollutants: completePollutants });
      const c40 = assessConfidence({ ageMinutes: 15, stationDistanceKm: 40.0, pollutants: completePollutants });
      expect(c25.factors.distanceScore).toBe(0.0);
      expect(c40.factors.distanceScore).toBe(0.0);
    });

    it('assigns 0.65 distance score for gridded models or unknown station distance', () => {
      const gridded = assessConfidence({ ageMinutes: 15, isGriddedModel: true, pollutants: completePollutants });
      const noDistance = assessConfidence({ ageMinutes: 15, pollutants: completePollutants });
      expect(gridded.factors.distanceScore).toBe(0.65);
      expect(noDistance.factors.distanceScore).toBe(0.65);
    });
  });

  describe('Pollutant Completeness Factor', () => {
    it('gives full score for complete criteria suite', () => {
      const res = assessConfidence({ ageMinutes: 15, stationDistanceKm: 1.0, pollutants: completePollutants });
      expect(res.factors.completenessScore).toBe(1.0);
    });

    it('penalizes readings that lack PM2.5 and PM10 particulates', () => {
      const noParticulate: PollutantValues = { no2: 50, so2: 20, co: 1.0 };
      const res = assessConfidence({ ageMinutes: 15, stationDistanceKm: 1.0, pollutants: noParticulate });
      expect(res.factors.completenessScore).toBeLessThan(0.3);
    });
  });

  describe('Provider Disagreement Factor', () => {
    it('scales linearly from 0% disagreement (1.0) to 50%+ disagreement (0.0)', () => {
      const zero = assessConfidence({ ageMinutes: 15, stationDistanceKm: 1.0, pollutants: completePollutants, providerDisagreementPct: 0 });
      const moderate = assessConfidence({ ageMinutes: 15, stationDistanceKm: 1.0, pollutants: completePollutants, providerDisagreementPct: 25 });
      const extreme = assessConfidence({ ageMinutes: 15, stationDistanceKm: 1.0, pollutants: completePollutants, providerDisagreementPct: 60 });

      expect(zero.factors.providerAgreementScore).toBe(1.0);
      expect(moderate.factors.providerAgreementScore).toBe(0.5);
      expect(extreme.factors.providerAgreementScore).toBe(0.0);
    });
  });

  describe("Tiers & 'I am unsure' Gating (Part 3.10)", () => {
    it('marks high tier with isUnsure: false for fresh, close, complete data', () => {
      const res = assessConfidence({ ageMinutes: 15, stationDistanceKm: 1.2, pollutants: completePollutants });
      expect(res.tier).toBe('high');
      expect(res.score).toBeGreaterThanOrEqual(0.75);
      expect(res.isUnsure).toBe(false);
      expect(res.explanation).toContain('High confidence');
    });

    it('triggers isUnsure: true if data is older than 180 minutes (3 hours)', () => {
      const res = assessConfidence({ ageMinutes: 185, stationDistanceKm: 1.0, pollutants: completePollutants });
      expect(res.isUnsure).toBe(true);
      expect(res.explanation).toContain("I'm unsure");
    });

    it('triggers isUnsure: true if score falls below 0.45', () => {
      const res = assessConfidence({
        ageMinutes: 240,
        stationDistanceKm: 22.0,
        pollutants: { pm25: 120 },
        providerDisagreementPct: 40,
      });
      expect(res.score).toBeLessThan(0.45);
      expect(res.tier).toBe('low');
      expect(res.isUnsure).toBe(true);
    });
  });
});
