import { describe, it, expect } from 'vitest';
import {
  pm25ToIndiaAqi,
  pm25ToUsEpaAqi,
  indiaAqiCategory,
} from '../../src/lib/aqi-breakpoints';

describe('India CPCB AQI Breakpoints', () => {
  // Table-driven tests against published CPCB examples
  const cases: Array<{ pm25: number; expectedCategory: string; aqiMin: number; aqiMax: number }> = [
    { pm25: 0,   expectedCategory: 'Good',         aqiMin: 0,   aqiMax: 50 },
    { pm25: 15,  expectedCategory: 'Good',         aqiMin: 0,   aqiMax: 50 },
    { pm25: 30,  expectedCategory: 'Good',         aqiMin: 50,  aqiMax: 50 },
    { pm25: 31,  expectedCategory: 'Satisfactory', aqiMin: 51,  aqiMax: 100 },
    { pm25: 45,  expectedCategory: 'Satisfactory', aqiMin: 51,  aqiMax: 100 },
    { pm25: 60,  expectedCategory: 'Satisfactory', aqiMin: 100, aqiMax: 100 },
    { pm25: 61,  expectedCategory: 'Moderate',     aqiMin: 101, aqiMax: 200 },
    { pm25: 75,  expectedCategory: 'Moderate',     aqiMin: 101, aqiMax: 200 },
    { pm25: 90,  expectedCategory: 'Moderate',     aqiMin: 200, aqiMax: 200 },
    { pm25: 91,  expectedCategory: 'Poor',         aqiMin: 201, aqiMax: 300 },
    { pm25: 120, expectedCategory: 'Poor',         aqiMin: 300, aqiMax: 300 },
    { pm25: 121, expectedCategory: 'Very Poor',    aqiMin: 301, aqiMax: 400 },
    { pm25: 185, expectedCategory: 'Very Poor',    aqiMin: 301, aqiMax: 400 },
    { pm25: 250, expectedCategory: 'Very Poor',    aqiMin: 400, aqiMax: 400 },
    { pm25: 251, expectedCategory: 'Severe',       aqiMin: 401, aqiMax: 500 },
    { pm25: 375, expectedCategory: 'Severe',       aqiMin: 401, aqiMax: 500 },
    { pm25: 500, expectedCategory: 'Severe',       aqiMin: 500, aqiMax: 500 },
  ];

  for (const tc of cases) {
    it(`PM2.5 = ${tc.pm25} µg/m³ → ${tc.expectedCategory} (AQI ${tc.aqiMin}–${tc.aqiMax})`, () => {
      const result = pm25ToIndiaAqi(tc.pm25);
      expect(result.category).toBe(tc.expectedCategory);
      expect(result.value).toBeGreaterThanOrEqual(tc.aqiMin);
      expect(result.value).toBeLessThanOrEqual(tc.aqiMax);
    });
  }

  it('should throw for negative PM2.5', () => {
    expect(() => pm25ToIndiaAqi(-1)).toThrow();
  });

  it('should cap at 500 for extreme values', () => {
    const result = pm25ToIndiaAqi(999);
    expect(result.value).toBe(500);
    expect(result.category).toBe('Severe');
  });

  // Boundary value tests
  it('boundary: PM2.5 = 30 → Good (AQI = 50)', () => {
    expect(pm25ToIndiaAqi(30).value).toBe(50);
  });

  it('boundary: PM2.5 = 60 → Satisfactory (AQI = 100)', () => {
    expect(pm25ToIndiaAqi(60).value).toBe(100);
  });

  it('boundary: PM2.5 = 90 → Moderate (AQI = 200)', () => {
    expect(pm25ToIndiaAqi(90).value).toBe(200);
  });
});

describe('US EPA AQI Breakpoints', () => {
  it('PM2.5 = 5 → Good', () => {
    const result = pm25ToUsEpaAqi(5);
    expect(result.category).toBe('Good');
    expect(result.value).toBeLessThanOrEqual(50);
  });

  it('PM2.5 = 20 → Moderate', () => {
    const result = pm25ToUsEpaAqi(20);
    expect(result.category).toBe('Moderate');
  });

  it('PM2.5 = 50 → Unhealthy for Sensitive Groups', () => {
    const result = pm25ToUsEpaAqi(50);
    expect(result.category).toBe('Unhealthy for Sensitive Groups');
  });

  it('PM2.5 = 100 → Unhealthy', () => {
    const result = pm25ToUsEpaAqi(100);
    expect(result.category).toBe('Unhealthy');
  });

  it('should throw for negative PM2.5', () => {
    expect(() => pm25ToUsEpaAqi(-1)).toThrow();
  });
});

describe('indiaAqiCategory', () => {
  it('AQI 25 → Good', () => expect(indiaAqiCategory(25)).toBe('Good'));
  it('AQI 50 → Good', () => expect(indiaAqiCategory(50)).toBe('Good'));
  it('AQI 51 → Satisfactory', () => expect(indiaAqiCategory(51)).toBe('Satisfactory'));
  it('AQI 150 → Moderate', () => expect(indiaAqiCategory(150)).toBe('Moderate'));
  it('AQI 250 → Poor', () => expect(indiaAqiCategory(250)).toBe('Poor'));
  it('AQI 350 → Very Poor', () => expect(indiaAqiCategory(350)).toBe('Very Poor'));
  it('AQI 450 → Severe', () => expect(indiaAqiCategory(450)).toBe('Severe'));
});
