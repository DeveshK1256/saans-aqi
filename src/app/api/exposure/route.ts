/**
 * Personal Exposure Calculation API Endpoint (`/api/exposure`)
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculatePersonalExposure } from '../../../domain/exposure/exposure-engine';
import { AppError } from '../../../lib/errors';
import { HouseholdMember, HouseholdProfile } from '../../../domain/household/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { member, profile, ambientPm25 } = body as {
      member: HouseholdMember;
      profile: HouseholdProfile;
      ambientPm25: number;
    };

    if (!member || !profile || typeof ambientPm25 !== 'number' || ambientPm25 < 0) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Valid member, profile, and non-negative ambientPm25 are required' } },
        { status: 400 }
      );
    }

    const result = calculatePersonalExposure({ member, profile, ambientPm25 });
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.toJSON() }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
  }
}
