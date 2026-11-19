/**
 * What-If Simulation API Endpoint (`/api/exposure/what-if`)
 */

import { NextRequest, NextResponse } from 'next/server';
import { simulateWhatIf } from '../../../../domain/exposure/what-if';
import { AppError } from '../../../../lib/errors';
import { HouseholdMember, HouseholdProfile } from '../../../../domain/household/types';
import { WhatIfOverrides } from '../../../../domain/exposure/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { member, profile, ambientPm25, overrides } = body as {
      member: HouseholdMember;
      profile: HouseholdProfile;
      ambientPm25: number;
      overrides: WhatIfOverrides;
    };

    if (!member || !profile || typeof ambientPm25 !== 'number' || !overrides) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Valid member, profile, ambientPm25, and overrides are required' } },
        { status: 400 }
      );
    }

    const result = simulateWhatIf({ member, profile, ambientPm25, overrides });
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.toJSON() }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
  }
}
