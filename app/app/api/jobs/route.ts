import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
    const reference = String(b?.reference || '');
    const source = String(b?.source || '');
    const referenceSize = Number(b?.referenceSize || 0);
    const sourceSize = Number(b?.sourceSize || 0);
    if (!reference || !source) return NextResponse.json({ error: 'reference and source keys are required' }, { status: 400 });
    if (!Number.isSafeInteger(referenceSize) || !Number.isSafeInteger(sourceSize) || referenceSize <= 0 || sourceSize <= 0 || referenceSize > MAX || sourceSize > MAX) return NextResponse.json({ error: 'File too large or invalid' }, { status: 413 });
    if (!reference.startsWith('uploads/') || !source.startsWith('uploads/')) return NextResponse.json({ error: 'Invalid upload key' }, { status: 400 });
    const { bucket, client } = storage();
    const id = crypto.randomUUID();
    const job = { id, status: 'QUEUED', reference, source, referenceSize, sourceSize, createdAt: new Date().toISOString(), version: '5.2.1' };
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: `jobs/${id}.json`, Body: JSON.stringify(job), ContentType: 'application/json', CacheControl: 'no-store' }));
    return NextResponse.json({ id, status: 'QUEUED', version: '5.2.1' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Job submission failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
