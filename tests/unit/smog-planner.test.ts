import { describe, expect, it } from 'vitest';
import { evaluate72HourSmogPlan } from '../../src/domain/forecast/smog-planner';

describe('72-Hour Smog Forecast Planner & Stagnation Alert (F8, F22)', () => {
  it('flags severe smog days and triggers actionable shopping prep', () => {
    const today = new Date('2026-11-20T10:00:00Z');
    const mockForecast = [
      { date: new Date(today), ambientPm25: 180, windSpeedMs: 2.5 },
      { date: new Date('2026-11-21T10:00:00Z'), ambientPm25: 290, windSpeedMs: 1.0 }, // Severe day
      { date: new Date('2026-11-22T10:00:00Z'), ambientPm25: 140, windSpeedMs: 3.0 },
    ];

    const result = evaluate72HourSmogPlan(mockForecast);

    expect(result.days.length).toBe(3);
    expect(result.hasSevereDays).toBe(true);
    expect(result.days[1].category).toBe('Severe');
    expect(result.days[1].isHighSmogDay).toBe(true);

    // Verify urgent shopping items populated
    const n95Item = result.shoppingList.find(item => item.item.includes('N95'));
    expect(n95Item).toBeDefined();
    expect(n95Item!.urgency).toBe('tonight');
  });

  it('detects low wind inversion and triggers stagnation alert', () => {
    const mockCalmForecast = [
      { date: new Date(), ambientPm25: 220, windSpeedMs: 0.9 }, // Stagnation condition
      { date: new Date(), ambientPm25: 210, windSpeedMs: 1.1 },
      { date: new Date(), ambientPm25: 190, windSpeedMs: 1.2 },
    ];

    const result = evaluate72HourSmogPlan(mockCalmForecast);
    expect(result.stagnationAlert.active).toBe(true);
    expect(result.stagnationAlert.inversionDetected).toBe(true);
    expect(result.stagnationAlert.headline).toContain('Atmospheric Stagnation Alert');
  });
});
