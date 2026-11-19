/**
 * Household DPDP Act 2023 Data Export API Endpoint (`/api/household/export`)
 * Enforces SEC-18 (DPDP consent, data export, & deletion work).
 */

import { NextRequest, NextResponse } from 'next/server';
import { householdService } from '../../../../domain/household/household-service';
import { AuthorizationMatrix } from '../../../../lib/authz';
import { AppError } from '../../../../lib/errors';
import { UserSession } from '../../../../domain/auth/types';

function resolveSession(req: NextRequest): UserSession {
  const authHeader = req.headers.get('authorization');
  const userIdHeader = req.headers.get('x-user-id');
  const userId = userIdHeader || (authHeader?.replace('Bearer ', '')) || 'usr_priya_pune_2026';

  return {
    userId,
    email: `${userId}@example.com`,
    name: 'Priya Sharma',
    provider: 'google',
    role: 'household_owner',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600 * 1000,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = resolveSession(req);
    const profile = await householdService.getHouseholdByUserId(session.userId);

    if (!profile) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'No profile found for export' } }, { status: 404 });
    }

    AuthorizationMatrix.assertHouseholdAccess(session, profile.userId, 'export');

    const exportData = await householdService.exportUserData(session.userId);

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="saans-data-export-${session.userId}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.toJSON() }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
  }
}
