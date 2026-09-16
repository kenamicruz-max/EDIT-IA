import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'edit-ia-media';
const MAX = 500 * 1024 * 1024;
const safeEnv = (name: string) => process.env[name]?.trim().replace(/^['\"]|['\"]$/g, '') || '';

function storage() {
  const endpointRaw = safeEnv('STORAGE_ENDPOINT');
  const accessKey = safeEnv('STORAGE_ACCESS_KEY');
  const secretKey = safeEnv('STORAGE_SECRET_KEY');
  if (!endpointRaw || !accessKey || !secretKey) throw new Error('Storage is not configured');
  const endpoint = /^https?:\/\//i.test(endpointRaw) ? endpointRaw : `https://${endpointRaw}`;
  return new S3Client({
    region: safeEnv('STORAGE_REGION') || 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const size = Number(body?.size || 0);
    const type = String(body?.type || '');

    if (!name || !Number.isSafeInteger(size) || size <= 0 || size > MAX) {
      return fail('Cada vídeo debe tener un tamaño válido de hasta 500 MB.', 413);
    }
    if (type !== 'video/mp4' || !/\.mp4$/i.test(name)) {
      return fail('Solo se aceptan archivos MP4.', 400);
    }

    const client = storage();
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'video.mp4';
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: 'video/mp4' }),
      { expiresIn: 900 },
    );

    return NextResponse.json(
      { key, url, expiresIn: 900 },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('upload preparation failed', error);
    return fail('No se pudo preparar la subida. Comprueba la configuración del almacenamiento.', 503);
  }
}
