import { describe, expect, it } from 'vitest';
import { generateDailyMicroRoutines } from '../../src/domain/routines/ventilation-planner';

describe('Saans Ventilation Planner & Micro-Routines (F7)', () => {
  it('generates 24-hour diurnal coverage without time gaps', () => {
    const result = generateDailyMicroRoutines({ baseAmbientPm25: 180 });
    expect(result.slots.length).toBe(6);

    // Verify time continuity from 0 to 24
    expect(result.slots[0].startHour).toBe(0);
    expect(result.slots[result.slots.length - 1].endHour).toBe(24);

    for (let i = 0; i < result.slots.length - 1; i++) {
      expect(result.slots[i].endHour).toBe(result.slots[i + 1].startHour);
    }
  });

  it('correctly identifies morning inversion peak (06:00–10:00) as danger/seal_windows', () => {
    const result = generateDailyMicroRoutines({ baseAmbientPm25: 200 });
    const morningSlot = result.slots.find(s => s.startHour === 6);

    expect(morningSlot).toBeDefined();
    expect(morningSlot!.recommendation).toBe('seal_windows');
    expect(morningSlot!.status).toBe('danger');
    expect(morningSlot!.boundaryLayerStatus).toBe('inversion_trapped');
  });

  it('identifies afternoon solar mixing window (12:00–16:00) as optimal for ventilation', () => {
    const result = generateDailyMicroRoutines({ baseAmbientPm25: 200 });
    const noonSlot = result.slots.find(s => s.startHour === 12);

    expect(noonSlot).toBeDefined();
    expect(noonSlot!.recommendation).toBe('ventilate_optimal');
    expect(noonSlot!.status).toBe('good');
    expect(noonSlot!.ambientExpectedPm25).toBeLessThan(200); // Convective dilution
    expect(result.bestVentilationWindow.start).toBe('13:00');
  });
});
