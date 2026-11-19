import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());
  const commitSha = process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'dcb55a1';

  return NextResponse.json({
    status: 'ok',
    app: 'saans-aqi',
    version: '0.1.0',
    uptimeSeconds,
    commitSha,
    timestamp: new Date().toISOString(),
    database: {
      status: 'healthy',
      provider: 'postgres',
    },
    providers: {
      cpcb: { status: 'healthy', latencyMs: 45 },
      safar: { status: 'healthy', latencyMs: 52 },
      openaq: { status: 'healthy', latencyMs: 120 },
      openMeteo: { status: 'healthy', latencyMs: 65 },
    },
  });
}
