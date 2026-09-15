import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';

const MAX = 500 * 1024 * 1024;
const REQUIRED = ['STORAGE_BUCKET', 'STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'] as const;

function storage() {
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Storage runtime configuration is missing: ${missing.join(', ')}`);

  const bucket = process.env.STORAGE_BUCKET!.trim();
  const endpoint = process.env.STORAGE_ENDPOINT!.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY!.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_KEY!.trim();
  const region = process.env.STORAGE_REGION?.trim() || 'auto';

  return { bucket, client: new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }) };
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
    return NextResponse.json({ key, url, version: '5.2.1' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload setup failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
