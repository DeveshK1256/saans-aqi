import { NextRequest, NextResponse } from 'next/server';
import { evaluate72HourSmogPlan } from '@/domain/forecast/smog-planner';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const basePm25 = parseFloat(searchParams.get('ambientPm25') || '220');

    const today = new Date();
    const day1 = new Date(today);
    const day2 = new Date(today);
    day2.setDate(today.getDate() + 1);
    const day3 = new Date(today);
    day3.setDate(today.getDate() + 2);

    const mockForecast = [
      { date: day1, ambientPm25: basePm25, windSpeedMs: 1.1 },
      { date: day2, ambientPm25: basePm25 * 1.35, windSpeedMs: 0.8 }, // Surge day
      { date: day3, ambientPm25: basePm25 * 0.9, windSpeedMs: 2.4 },
    ];

    const result = evaluate72HourSmogPlan(mockForecast);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORECAST_ERROR',
          message: err?.message || 'Failed to generate 72h smog forecast plan',
        },
      },
      { status: 500 }
    );
  }
}
