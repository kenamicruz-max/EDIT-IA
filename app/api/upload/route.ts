import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 500 * 1024 * 1024;
const env = (name: string) => process.env[name]?.trim().replace(/^['\"]|['\"]$/g, '') || '';

function storage() {
  const bucket = env('STORAGE_BUCKET');
  const endpointValue = env('STORAGE_ENDPOINT');
  const access = env('STORAGE_ACCESS_KEY');
  const secret = env('STORAGE_' + 'SECRET_KEY');
  const missing = ['STORAGE_BUCKET', 'STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'].filter((name) => !env(name));
  if (missing.length) throw new Error(`Storage runtime configuration is missing: ${missing.join(', ')}`);
  const endpoint = /^https?:\/\//i.test(endpointValue) ? endpointValue : `https://${endpointValue}`;
  return {
    bucket,
    client: new S3Client({
      region: env('STORAGE_REGION') || 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: access, secretAccessKey: secret },
    }),
  };
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const name = String(b?.name || 'video.mp4');
    const size = Number(b?.size || 0);
    const type = String(b?.type || 'video/mp4');
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX) return NextResponse.json({ error: 'Cada vídeo deve ter no máximo 500 MB.' }, { status: 413 });
    if (type !== 'video/mp4' && !name.toLowerCase().endsWith('.mp4')) return NextResponse.json({ error: 'Somente arquivos MP4 são aceitos.' }, { status: 400 });
    const { bucket, client } = storage();
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'video.mp4';
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;
    const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'video/mp4' }), { expiresIn: 900 });
    return NextResponse.json({ key, url, version: '5.2.3' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload setup failed', version: '5.2.3' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
