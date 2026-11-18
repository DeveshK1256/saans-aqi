import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Air Data API Response Schema (from Section 10.3)
const airDataSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['pm25', 'source', 'station_or_grid', 'observed_at', 'age_minutes', 'freshness'],
  properties: {
    pm25: { type: 'number', minimum: 0, maximum: 999 },
    pm10: { type: ['number', 'null'], minimum: 0 },
    aqi_india: { type: 'integer', minimum: 0, maximum: 500 },
    aqi_category: {
      type: 'string',
      enum: ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'],
    },
    source: {
      type: 'string',
      enum: ['cpcb', 'safar', 'openaq', 'open_meteo_cams', 'cached'],
    },
    station_or_grid: { type: 'string' },
    station_distance_km: { type: ['number', 'null'] },
    observed_at: { type: 'string', format: 'date-time' },
    age_minutes: { type: 'integer', minimum: 0 },
    freshness: {
      type: 'string',
      enum: ['live', 'recent', 'stale', 'very_stale'],
    },
    location: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
      },
    },
  },
};

const mythVerdictSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['claim_summary', 'verdict', 'explanation', 'citations', 'confidence', 'language'],
  properties: {
    claim_summary: { type: 'string', maxLength: 200 },
    verdict: {
      type: 'string',
      enum: ['Supported', 'Partly supported', 'Not supported', 'Insufficient evidence'],
    },
    explanation: { type: 'string', minLength: 20, maxLength: 1000 },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'publisher', 'year'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          publisher: { type: 'string' },
          year: { type: 'integer', minimum: 1990 },
          url: { type: 'string', format: 'uri' },
        },
      },
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    language: { type: 'string', enum: ['en', 'hi', 'mr'] },
  },
  additionalProperties: false,
};

const validateAirData = ajv.compile(airDataSchema);
const validateMythVerdict = ajv.compile(mythVerdictSchema);

describe('Air Data Response Schema', () => {
  it('should validate a correct response from CPCB', () => {
    const valid = validateAirData({
      pm25: 185.3,
      pm10: 290.0,
      aqi_india: 287,
      aqi_category: 'Poor',
      source: 'cpcb',
      station_or_grid: 'Dwarka Sector 8, Delhi',
      station_distance_km: 3.2,
      observed_at: '2026-11-18T06:30:00Z',
      age_minutes: 12,
      freshness: 'live',
      location: { lat: 28.59, lon: 77.07 },
    });
    expect(valid).toBe(true);
  });

  it('should validate a cached/stale response', () => {
    const valid = validateAirData({
      pm25: 150.0,
      pm10: null,
      aqi_india: 240,
      aqi_category: 'Poor',
      source: 'cached',
      station_or_grid: 'Dwarka Sector 8, Delhi',
      station_distance_km: 3.2,
      observed_at: '2026-11-18T02:00:00Z',
      age_minutes: 270,
      freshness: 'stale',
    });
    expect(valid).toBe(true);
  });

  it('should reject response missing required fields', () => {
    const valid = validateAirData({
      pm25: 100,
      source: 'openaq',
      // missing station_or_grid, observed_at, age_minutes, freshness
    });
    expect(valid).toBe(false);
  });

  it('should reject negative PM2.5', () => {
    const valid = validateAirData({
      pm25: -5,
      source: 'cpcb',
      station_or_grid: 'Test',
      observed_at: '2026-11-18T06:30:00Z',
      age_minutes: 0,
      freshness: 'live',
    });
    expect(valid).toBe(false);
  });

  it('should reject invalid source', () => {
    const valid = validateAirData({
      pm25: 100,
      source: 'unknown_provider',
      station_or_grid: 'Test',
      observed_at: '2026-11-18T06:30:00Z',
      age_minutes: 0,
      freshness: 'live',
    });
    expect(valid).toBe(false);
  });

  it('should reject invalid freshness tier', () => {
    const valid = validateAirData({
      pm25: 100,
      source: 'cpcb',
      station_or_grid: 'Test',
      observed_at: '2026-11-18T06:30:00Z',
      age_minutes: 0,
      freshness: 'super_fresh',
    });
    expect(valid).toBe(false);
  });
});

describe('Myth Verdict Schema', () => {
  it('should validate a correct Not Supported verdict', () => {
    const valid = validateMythVerdict({
      claim_summary: 'Jaggery detoxifies lungs from pollution',
      verdict: 'Not supported',
      explanation: 'No clinical evidence supports that dietary jaggery has any effect on pulmonary clearance of PM2.5 particles. The claim conflates general antioxidant properties with specific respiratory function.',
      citations: [
        {
          id: 'ev-001',
          title: 'Health effects of ambient air pollution',
          publisher: 'WHO',
          year: 2021,
          url: 'https://www.who.int/publications/i/item/9789240034228',
        },
      ],
      confidence: 'high',
      language: 'en',
    });
    expect(valid).toBe(true);
  });

  it('should validate Insufficient evidence verdict with no citations', () => {
    const valid = validateMythVerdict({
      claim_summary: 'Neem leaves absorb PM2.5',
      verdict: 'Insufficient evidence',
      explanation: 'We could not find reliable peer-reviewed research specifically testing neem leaf absorption of PM2.5 particles in real-world conditions.',
      citations: [],
      confidence: 'low',
      language: 'en',
    });
    expect(valid).toBe(true);
  });

  it('should reject invalid verdict value', () => {
    const valid = validateMythVerdict({
      claim_summary: 'Test claim',
      verdict: 'Definitely true',
      explanation: 'This is a test explanation that is long enough.',
      citations: [],
      confidence: 'high',
      language: 'en',
    });
    expect(valid).toBe(false);
  });

  it('should reject additional properties', () => {
    const valid = validateMythVerdict({
      claim_summary: 'Test claim',
      verdict: 'Not supported',
      explanation: 'This is a test explanation that is long enough.',
      citations: [],
      confidence: 'high',
      language: 'en',
      secret_field: 'should not be here',
    });
    expect(valid).toBe(false);
  });

  it('should reject explanation shorter than 20 characters', () => {
    const valid = validateMythVerdict({
      claim_summary: 'Test',
      verdict: 'Not supported',
      explanation: 'Too short',
      citations: [],
      confidence: 'high',
      language: 'en',
    });
    expect(valid).toBe(false);
  });
});
