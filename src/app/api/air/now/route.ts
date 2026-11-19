import { NextRequest, NextResponse } from 'next/server';
import { airService } from '@/domain/air/air-service';
import { AppError, toAppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');

    if (!latParam || !lonParam) {
      throw AppError.badRequest('Query parameters "lat" and "lon" are required');
    }

    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);

    if (isNaN(lat) || isNaN(lon)) {
      throw AppError.badRequest('"lat" and "lon" must be valid numeric floating point coordinates');
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw AppError.badRequest('Latitude must be between -90 and 90, longitude between -180 and 180');
    }

    const reading = await airService.getAirNow(lat, lon);
    return NextResponse.json(reading, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const appErr = toAppError(err);
    return NextResponse.json(
      { error: appErr.toJSON() },
      { status: appErr.statusCode }
    );
  }
}
