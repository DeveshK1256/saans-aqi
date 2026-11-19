import { NextRequest, NextResponse } from 'next/server';
import { generateDailyMicroRoutines } from '@/domain/routines/ventilation-planner';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ambientPm25 = parseFloat(searchParams.get('ambientPm25') || '180');
    const windSpeedMs = parseFloat(searchParams.get('windSpeedMs') || '1.2');

    const result = generateDailyMicroRoutines({
      baseAmbientPm25: ambientPm25,
      windSpeedMs,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PLANNER_ERROR',
          message: err?.message || 'Failed to generate micro-routines',
        },
      },
      { status: 500 }
    );
  }
}
