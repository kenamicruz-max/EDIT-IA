import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 500 * 1024 * 1024;
const BUCKET = 'edit-ia-media';
const VERSION = '5.2.14';

const clean = (name: string) => process.env[name]?.trim().replace(/^['\"]|['\"]$/g, '') || '';

function storage() {
  const missing = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'].filter(name => !clean(name));
  if (missing.length) throw new Error(`Storage runtime configuration is missing: ${missing.join(', ')}`);

  const rawEndpoint = clean('STORAGE_ENDPOINT');
  const endpoint = (rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://'))
    ? rawEndpoint.replace(/\/+$/, '')
    : `https://${rawEndpoint.replace(/\/+$/, '')}`;

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error('STORAGE_ENDPOINT is not a valid URL. Use https://<ACCOUNT_ID>.r2.cloudflarestorage.com');
  }

  if (!parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('STORAGE_ENDPOINT must be the Cloudflare R2 S3 endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com');
  }

  return new S3Client({
    region: clean('STORAGE_REGION') || 'auto',
    endpoint: parsed.toString().replace(/\/$/, ''),
    forcePathStyle: false,
    credentials: {
      accessKeyId: clean('STORAGE_ACCESS_KEY'),
      secretAccessKey: clean('STORAGE_SECRET_KEY'),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || 'video.mp4');
    const size = Number(body?.size || 0);
    const type = String(body?.type || 'video/mp4').toLowerCase();

    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX) {
      return NextResponse.json(
        { error: 'Cada vídeo deve ter no máximo 500 MB.', version: VERSION },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (type !== 'video/mp4' && !name.toLowerCase().endsWith('.mp4')) {
      return NextResponse.json(
        { error: 'Somente arquivos MP4 são aceitos.', version: VERSION },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const client = storage();
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'video.mp4';
    const key = `uploads/${crypto.randomUUID()}-${safe}`;

    // Do not sign Content-Type. R2 then accepts the browser's actual PUT headers
    // without risking a SignatureDoesNotMatch caused by browser header normalization.
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 900 },
    );

    return NextResponse.json(
      { key, url, method: 'PUT', bucket: BUCKET, version: VERSION },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload setup failed', version: VERSION },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
