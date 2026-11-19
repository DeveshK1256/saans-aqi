import { describe, it, expect } from 'vitest';
import { solveMassBalance } from '../../src/domain/exposure/mass-balance';

describe('Indoor Single-Zone Mass Balance Physical Model Tests (Part 3.3)', () => {
  it('correctly computes analytical steady-state and decay in closed room without purifier', () => {
    const res = solveMassBalance({
      airExchangeRate: 0.6,    // a = 0.6 h^-1
      penetrationFactor: 0.8,  // P = 0.8
      depositionRate: 0.2,     // k = 0.2 h^-1
      cadrEffectiveM3h: 0,     // Qp = 0
      roomVolumeM3: 40.0,      // V = 40 m3
      indoorSourceRateUgH: 0,  // S = 0
      outdoorConcUgM3: 150.0,  // Cout = 150 ug/m3
      initialIndoorConcUgM3: 150.0,
      timeStepHours: 8.0,
    });

    // lambda = a + k + Qp/V = 0.6 + 0.2 + 0 = 0.8 h^-1
    expect(res.lossRateLambda).toBeCloseTo(0.8, 5);

    // Css = (P * a * Cout + S/V) / lambda = (0.8 * 0.6 * 150) / 0.8 = 72 / 0.8 = 90 ug/m3
    expect(res.steadyStateConcUgM3).toBeCloseTo(90.0, 4);

    // At t = 8h, exp(-0.8 * 8) = exp(-6.4) ≈ 0.00166 -> 90.0 + 60 * 0.00166 ≈ 90.10 ug/m3
    expect(res.finalIndoorConcUgM3).toBeCloseTo(90.1, 1);
  });

  it('demonstrates massive indoor reduction when effective CADR purifier is introduced', () => {
    // 250 m3/h CADR in 40 m3 room = 6.25 ACH added filtration
    const withPurifier = solveMassBalance({
      airExchangeRate: 0.6,
      penetrationFactor: 0.8,
      depositionRate: 0.2,
      cadrEffectiveM3h: 250.0,
      roomVolumeM3: 40.0,
      indoorSourceRateUgH: 0,
      outdoorConcUgM3: 150.0,
      initialIndoorConcUgM3: 90.0,
      timeStepHours: 8.0,
    });

    // lambda = 0.6 + 0.2 + 250/40 = 0.8 + 6.25 = 7.05 h^-1
    expect(withPurifier.lossRateLambda).toBeCloseTo(7.05, 4);

    // Css = 72 / 7.05 ≈ 10.21 ug/m3
    expect(withPurifier.steadyStateConcUgM3).toBeCloseTo(10.21, 1);
    expect(withPurifier.finalIndoorConcUgM3).toBeLessThan(15.0);
  });

  it('rejects invalid inputs with zero room volume', () => {
    expect(() =>
      solveMassBalance({
        airExchangeRate: 0.6,
        penetrationFactor: 0.8,
        depositionRate: 0.2,
        cadrEffectiveM3h: 0,
        roomVolumeM3: 0,
        indoorSourceRateUgH: 0,
        outdoorConcUgM3: 100,
        initialIndoorConcUgM3: 50,
        timeStepHours: 1,
      })
    ).toThrow('Room volume must be greater than zero');
  });
});
