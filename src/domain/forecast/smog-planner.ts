/**
 * Saans 72-Hour Smog Forecast Planner & Stagnation Alert Engine
 * Identifies upcoming high-smog episodes, stagnation conditions,
 * and generates actionable household preparation checklists and shopping lists.
 * Implements Part 2 (F8, F22) of docs/00_MASTER_SPEC.md.
 */

import { SmogForecastDay, SmogForecastPlannerResult } from '../recommendations/types';

export interface ForecastDayInput {
  date: Date;
  ambientPm25: number;
  windSpeedMs: number;
  humidityPct?: number;
}

export function evaluate72HourSmogPlan(daysInput: ForecastDayInput[]): SmogForecastPlannerResult {
  const days: SmogForecastDay[] = [];
  let hasSevereDays = false;
  let activeStagnation = false;
  let worstWind = 99;

  daysInput.slice(0, 3).forEach((d, idx) => {
    // CPCB approximate AQI calculation from PM2.5
    let aqi = 100;
    let cat = 'Satisfactory';

    if (d.ambientPm25 > 250) {
      aqi = Math.min(500, Math.round(400 + ((d.ambientPm25 - 250) / 130) * 100));
      cat = 'Severe';
      hasSevereDays = true;
    } else if (d.ambientPm25 > 120) {
      aqi = Math.round(300 + ((d.ambientPm25 - 120) / 130) * 100);
      cat = 'Very Poor';
    } else if (d.ambientPm25 > 90) {
      aqi = Math.round(200 + ((d.ambientPm25 - 90) / 30) * 100);
      cat = 'Poor';
    } else if (d.ambientPm25 > 60) {
      aqi = Math.round(100 + ((d.ambientPm25 - 60) / 30) * 100);
      cat = 'Moderate';
    }

    const isHigh = aqi >= 250;
    if (d.windSpeedMs < worstWind) worstWind = d.windSpeedMs;
    if (d.windSpeedMs <= 1.5 && d.ambientPm25 >= 180) {
      activeStagnation = true;
    }

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateStr = d.date.toLocaleDateString('en-IN', dateOptions);

    let plan = 'Standard winter precautions: operate bedroom purifier overnight and ventilate midday.';
    if (aqi >= 400) {
      plan = 'RED ALERT: Severe smog surge expected. Reschedule outdoor children activities, prepare N95 masks, run purifiers continuously on boost speed.';
    } else if (aqi >= 300) {
      plan = 'VERY POOR: Avoid all outdoor morning exercise. Seal windows during rush hours. Ensure school children wear fitted N95 respirators.';
    }

    days.push({
      dayIndex: idx + 1,
      dateStr,
      expectedAqi: aqi,
      expectedPm25: Math.round(d.ambientPm25),
      category: cat,
      isHighSmogDay: isHigh,
      recommendedPlan: plan,
    });
  });

  // Targeted shopping & prep items based on forecast severity
  const shoppingList = [];
  if (hasSevereDays) {
    shoppingList.push({
      item: 'Pack of 5 NIOSH N95 / ISI FFP2 Masks',
      urgency: 'tonight' as const,
      reason: 'Severe smog episode approaching within 24–48 hours. Retail pharmacies frequently stock out during red alerts.',
      estimatedCostInr: 250,
    });
    shoppingList.push({
      item: 'Door Sweep / Foam Window Gap Weatherstrips',
      urgency: 'tonight' as const,
      reason: 'Seals leaky door cracks, cutting outdoor smog infiltration by up to 50% without hardware expense.',
      estimatedCostInr: 180,
    });
  }

  shoppingList.push({
    item: 'HEPA Air Purifier Replacement Pre-Filter Mesh',
    urgency: 'this_week' as const,
    reason: 'Rinse or replace pre-filter before peak winter stagnation to maintain CADR airflow efficiency.',
    estimatedCostInr: 350,
  });

  shoppingList.push({
    item: 'Asthma Inhaler Refill & Saline Nasal Spray',
    urgency: hasSevereDays ? ('tonight' as const) : ('optional' as const),
    reason: 'Ensure minimum 5-day supply of prescribed bronchodilator controller medications at home.',
    estimatedCostInr: 400,
  });

  return {
    days,
    hasSevereDays,
    stagnationAlert: {
      active: activeStagnation,
      headline: activeStagnation ? '⚠️ Atmospheric Stagnation Alert: Trapped Air Tonight' : 'Normal Dispersion Conditions',
      description: activeStagnation
        ? `Calm winds (${worstWind.toFixed(1)} m/s) coupled with surface temperature inversion will trap emissions close to ground level tonight. Avoid night walks and seal bedroom windows.`
        : `Wind speeds (${worstWind.toFixed(1)} m/s) provide adequate horizontal atmospheric dilution.`,
      windSpeedMs: worstWind,
      inversionDetected: activeStagnation,
    },
    shoppingList,
  };
}
