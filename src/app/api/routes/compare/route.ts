import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { compareCommuteRoutes } from '@/domain/routes/cleaner-route';

const RequestSchema = z.object({
  origin: z.string().default('Kothrud, Pune'),
  destination: z.string().default('Shivajinagar, Pune'),
  distanceKm: z.number().min(1).max(100).default(12),
  ambientPm25: z.number().min(10).max(1000).default(185),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);

    const comparison = compareCommuteRoutes({
      originText: parsed.origin,
      destinationText: parsed.destination,
      distanceKm: parsed.distanceKm,
      ambientPm25: parsed.ambientPm25,
    });

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ROUTE_ERROR',
          message: err?.message || 'Failed to compare commute routes',
        },
      },
      { status: 400 }
    );
  }
}
