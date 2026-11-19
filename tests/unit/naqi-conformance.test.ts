import { describe, it, expect } from 'vitest';
import { calculateSubIndex, computeNaqi, NAQI_BREAKPOINTS } from '../../src/domain/air/naqi';

describe('CPCB NAQI Engine Conformance Tests', () => {
  describe('Linear Interpolation & Breakpoints for PM2.5', () => {
    it('PM2.5 = 0 µg/m³ should give NAQI = 0 (Good)', () => {
      const res = calculateSubIndex('pm25', 0);
      expect(res.subIndex).toBe(0);
      expect(res.category).toBe('Good');
    });

    it('PM2.5 = 30 µg/m³ should give NAQI = 50 (Good boundary)', () => {
      const res = calculateSubIndex('pm25', 30);
      expect(res.subIndex).toBe(50);
      expect(res.category).toBe('Good');
    });

    it('PM2.5 = 60 µg/m³ should give NAQI = 100 (Satisfactory boundary)', () => {
      const res = calculateSubIndex('pm25', 60);
      expect(res.subIndex).toBe(100);
      expect(res.category).toBe('Satisfactory');
    });

    it('PM2.5 = 90 µg/m³ should give NAQI = 200 (Moderate boundary)', () => {
      const res = calculateSubIndex('pm25', 90);
      expect(res.subIndex).toBe(200);
      expect(res.category).toBe('Moderate');
    });

    it('PM2.5 = 120 µg/m³ should give NAQI = 300 (Poor boundary)', () => {
      const res = calculateSubIndex('pm25', 120);
      expect(res.subIndex).toBe(300);
      expect(res.category).toBe('Poor');
    });

    it('PM2.5 = 250 µg/m³ should give NAQI = 400 (Very Poor boundary)', () => {
      const res = calculateSubIndex('pm25', 250);
      expect(res.subIndex).toBe(400);
      expect(res.category).toBe('Very Poor');
    });

    it('PM2.5 = 500 µg/m³ should give NAQI = 500 (Severe cap)', () => {
      const res = calculateSubIndex('pm25', 500);
      expect(res.subIndex).toBe(500);
      expect(res.category).toBe('Severe');
    });

    it('PM2.5 > 500 µg/m³ should saturate at NAQI = 500 (Severe)', () => {
      const res = calculateSubIndex('pm25', 850);
      expect(res.subIndex).toBe(500);
      expect(res.category).toBe('Severe');
    });

    it('Negative concentration should throw error', () => {
      expect(() => calculateSubIndex('pm25', -5)).toThrow();
    });
  });

  describe('Multi-Pollutant Aggregation & Dominant Pollutant', () => {
    it('Overall NAQI is the maximum sub-index across measured pollutants', () => {
      const result = computeNaqi({
        pm25: 45, // Satisfactory (~75)
        pm10: 280, // Poor (~230) -> Dominant
        no2: 30, // Good (<50)
      });

      expect(result.dominantPollutant).toBe('pm10');
      expect(result.overallAqi).toBeGreaterThanOrEqual(201);
      expect(result.overallAqi).toBeLessThanOrEqual(300);
      expect(result.category).toBe('Poor');
      expect(result.isPartial).toBe(false); // 3 pollutants including PM10
    });

    it('Flags isPartial = true if fewer than 3 pollutants are available', () => {
      const result = computeNaqi({
        pm25: 180, // Very Poor
      });

      expect(result.overallAqi).toBeGreaterThanOrEqual(301);
      expect(result.isPartial).toBe(true); // only 1 pollutant
    });

    it('Flags isPartial = true if particulate (PM2.5 or PM10) is missing', () => {
      const result = computeNaqi({
        no2: 60,
        so2: 50,
        co: 1.5,
      });

      expect(result.isPartial).toBe(true); // 3 pollutants, but no PM2.5/PM10
    });
  });
});
