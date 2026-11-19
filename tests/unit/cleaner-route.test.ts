import { describe, expect, it } from 'vitest';
import { compareCommuteRoutes } from '../../src/domain/routes/cleaner-route';

describe('Cleaner-Route Commute Comparison (F21 / GS-08)', () => {
  it('computes dose reduction and avoided tailpipe emissions between arterial bike and metro', () => {
    const result = compareCommuteRoutes({
      originText: 'Kothrud, Pune',
      destinationText: 'Viman Nagar, Pune',
      distanceKm: 15,
      ambientPm25: 180,
    });

    expect(result.standardRoute.mode).toContain('Two-Wheeler');
    expect(result.cleanerRoute.mode).toContain('Metro');

    // Inhaled dose reduction
    expect(result.exposureAvoidedPct).toBeGreaterThan(50);
    expect(result.doseAvoidedUg.central).toBeGreaterThan(0);

    // Two-way tailpipe impact: 30 km round-trip * (72 - 16) g/km = 1,680 g CO2
    expect(result.co2AvoidedGrams).toBe(1680);
    expect(result.pmAvoidedMg).toBeGreaterThan(1000);
  });
});
