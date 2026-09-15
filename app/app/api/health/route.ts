import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED = ['STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'] as const;

function clean(value: string | undefined) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '') || '';
}

export async function GET() {
  const configured = Object.fromEntries(
    REQUIRED.map((name) => [name, Boolean(clean(process.env[name]))]),
  );
  const allConfigured = Object.values(configured).every(Boolean);

  let storage = 'not-tested';
  let storageError: string | null = null;

  if (allConfigured) {
    try {
      const rawEndpoint = clean(process.env.STORAGE_ENDPOINT);
      const endpoint = /^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `https://${rawEndpoint}`;
      const client = new S3Client({
        region: clean(process.env.STORAGE_REGION) || 'auto',
        endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: clean(process.env.STORAGE_ACCESS_KEY),
          secretAccessKey: clean(process.env.STORAGE_SECRET_KEY),
        },
      });
      await client.send(new ListObjectsV2Command({
        Bucket: clean(process.env.STORAGE_BUCKET),
        Prefix: 'jobs/',
        MaxKeys: 1,
      }));
      storage = 'ok';
    } catch (e) {
      storage = 'error';
      storageError = e instanceof Error ? e.message : 'R2 connection failed';
    }
  }

  const ok = allConfigured && storage === 'ok';
  return NextResponse.json(
    { ok, configured, storage, storageError, version: '5.2.3' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
