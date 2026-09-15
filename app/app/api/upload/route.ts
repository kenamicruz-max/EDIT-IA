import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX = 500 * 1024 * 1024;

function storage() {
  const bucket = process.env.STORAGE_BUCKET;
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) throw new Error('Storage is not configured');
  return { bucket, client: new S3Client({ region: process.env.STORAGE_REGION || 'auto', endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }) };
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
    return NextResponse.json({ key, url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload setup failed' }, { status: 500 });
  }
}
