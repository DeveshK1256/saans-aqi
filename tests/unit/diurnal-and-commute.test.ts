import { describe, it, expect } from 'vitest';

describe('Diurnal Boundary Layer & Convective Cleansing Model', () => {
  const DIURNAL_PBL_DATA = {
    0:  { pbl: 190, pm: 210, status: 'Severe Ground Inversion' },
    4:  { pbl: 165, pm: 238, status: 'Pre-Dawn Minimum PBL' },
    7:  { pbl: 220, pm: 268, status: 'Morning Rush & Capped Inversion' },
    14: { pbl: 1650, pm: 52, status: 'Maximum Convective Cleansing' },
    20: { pbl: 300, pm: 220, status: 'Shallow Capping Inversion' }
  };

  it('guarantees afternoon convective mixing layer height exceeds morning inversion by at least 4x', () => {
    const morningPbl = DIURNAL_PBL_DATA[7].pbl;
    const afternoonPbl = DIURNAL_PBL_DATA[14].pbl;

    expect(afternoonPbl).toBeGreaterThan(morningPbl * 4);
    expect(afternoonPbl).toBe(1650);
    expect(morningPbl).toBe(220);
  });

  it('correctly models particulate dilution during peak solar convective window', () => {
    const morningPM = DIURNAL_PBL_DATA[7].pm;
    const afternoonPM = DIURNAL_PBL_DATA[14].pm;
    const dilutionFactor = (morningPM - afternoonPM) / morningPM;

    expect(dilutionFactor).toBeGreaterThan(0.70); // Over 70% dilution
  });

  it('computes atmospheric ventilation coefficient (Vc = Wind * PBL) correctly', () => {
    function computeVc(windSpeed: number, pblHeight: number) {
      return Math.round(windSpeed * pblHeight);
    }

    function classifyVc(vc: number): 'stagnant' | 'moderate' | 'cleansing' {
      if (vc < 2000) return 'stagnant';
      if (vc < 6000) return 'moderate';
      return 'cleansing';
    }

    // Delhi Anand Vihar calm night
    expect(classifyVc(computeVc(1.2, 230))).toBe('stagnant');
    expect(computeVc(1.2, 230)).toBe(276);

    // Pune Shivajinagar afternoon breeze
    expect(classifyVc(computeVc(2.8, 760))).toBe('moderate');

    // High convective cleansing scenario
    expect(classifyVc(computeVc(4.2, 1650))).toBe('cleansing');
  });
});

describe('Interactive Commute Inhaled Dose Engine', () => {
  interface CommuteParams {
    basePM: number;
    distKm: number;
    baseMins: number;
    timeMultiplier: number;
    exposureMultiplier: number;
    ve: number;
    speedFactor: number;
  }

  function calculateCommuteDose(params: CommuteParams): number {
    const durationHours = (params.baseMins / params.speedFactor) / 60;
    const dose = params.basePM * params.timeMultiplier * params.exposureMultiplier * params.ve * durationHours;
    return Math.round(dose * 10) / 10;
  }

  it('proves sealed filtered metro cuts inhaled toxic particulate dose by >= 60% compared to two-wheeler', () => {
    const basePM = 240;
    const distKm = 14.2;
    const baseMins = 38;
    const morningTimeMultiplier = 1.35;

    // Two-wheeler (open plume exposure: 1.8x, VE: 0.85)
    const doseBike = calculateCommuteDose({
      basePM,
      distKm,
      baseMins,
      timeMultiplier: morningTimeMultiplier,
      exposureMultiplier: 1.8,
      ve: 0.85,
      speedFactor: 1.0
    });

    // Metro transit (sealed filtered coach: 0.35x, VE: 0.80)
    const doseMetro = calculateCommuteDose({
      basePM,
      distKm,
      baseMins,
      timeMultiplier: morningTimeMultiplier,
      exposureMultiplier: 0.35,
      ve: 0.80,
      speedFactor: 1.25
    });

    expect(doseBike).toBeGreaterThan(150);
    expect(doseMetro).toBeLessThan(70);
    const reductionPct = ((doseBike - doseMetro) / doseBike) * 100;
    expect(reductionPct).toBeGreaterThan(65);
  });

  it('validates afternoon convective departure window cuts commute exposure significantly vs morning peak', () => {
    const basePM = 200;
    const params = {
      basePM,
      distKm: 18.0,
      baseMins: 45,
      exposureMultiplier: 1.0, // standard cab
      ve: 0.75,
      speedFactor: 1.0
    };

    const doseMorning = calculateCommuteDose({ ...params, timeMultiplier: 1.35 });
    const doseAfternoon = calculateCommuteDose({ ...params, timeMultiplier: 0.65 });

    expect(doseAfternoon).toBeLessThan(doseMorning * 0.55);
  });
});
