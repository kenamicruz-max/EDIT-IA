import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'] as const;
const clean = (value: string | undefined) => value?.trim().replace(/^['\"]|['\"]$/g, '') || '';
const bucket = () => clean(process.env.STORAGE_BUCKET) || 'edit-ia-media';

export async function GET() {
  const configured = Object.fromEntries(REQUIRED.map((name) => [name, Boolean(clean(process.env[name]))]));
  configured.STORAGE_BUCKET = Boolean(bucket());
  const allConfigured = Object.values(configured).every(Boolean);
  let storage = 'not-tested';
  let storageError: string | null = null;
  if (allConfigured) {
    try {
      const raw = clean(process.env.STORAGE_ENDPOINT);
      const endpoint = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const client = new S3Client({ region: clean(process.env.STORAGE_REGION) || 'auto', endpoint, forcePathStyle: true, credentials: { accessKeyId: clean(process.env.STORAGE_ACCESS_KEY), secretAccessKey: clean(process.env.STORAGE_SECRET_KEY) } });
      await client.send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: 'jobs/', MaxKeys: 1 }));
      storage = 'ok';
    } catch (e) { storage = 'error'; storageError = e instanceof Error ? e.message : 'R2 connection failed'; }
  }
  return NextResponse.json({ ok: allConfigured && storage === 'ok', configured, storage, storageError, version: '5.2.5' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
