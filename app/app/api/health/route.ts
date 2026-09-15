import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUIRED = [
  'STORAGE_ENDPOINT',
  'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'STORAGE_REGION',
] as const;

export async function GET() {
  const configured = Object.fromEntries(
    REQUIRED.map((name) => [name, Boolean(process.env[name]?.trim())]),
  );

  const allConfigured = Object.values(configured).every(Boolean);

  return NextResponse.json(
    {
      ok: allConfigured,
      configured,
      version: '5.2.2',
    },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
