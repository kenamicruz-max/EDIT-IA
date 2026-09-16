import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_BUCKET = 'edit-ia-media';
const MAX = 500 * 1024 * 1024;
const safeEnv = (name: string) => process.env[name]?.trim().replace(/^['\"]|['\"]$/g, '') || '';

function storage() {
  const endpointRaw = safeEnv('STORAGE_ENDPOINT');
  const accessKey = safeEnv('STORAGE_ACCESS_KEY');
  const secretKey = safeEnv('STORAGE_SECRET_KEY');
  const bucket = safeEnv('STORAGE_BUCKET') || DEFAULT_BUCKET;
  const missing = [
    ['STORAGE_ENDPOINT', endpointRaw],
    ['STORAGE_ACCESS_KEY', accessKey],
    ['STORAGE_SECRET_KEY', secretKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    const error = new Error(`Missing storage configuration: ${missing.join(', ')}`);
    (error as Error & { code?: string }).code = 'STORAGE_NOT_CONFIGURED';
    throw error;
  }

  const endpoint = /^https?:\/\//i.test(endpointRaw) ? endpointRaw : `https://${endpointRaw}`;
  return {
    bucket,
    client: new S3Client({
      region: safeEnv('STORAGE_REGION') || 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    }),
  };
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const size = Number(body?.size || 0);
    const type = String(body?.type || '');

    if (!name || !Number.isSafeInteger(size) || size <= 0 || size > MAX) {
      return fail('Cada vídeo debe tener un tamaño válido de hasta 500 MB.', 413, 'INVALID_FILE_SIZE');
    }
    if (type !== 'video/mp4' || !/\.mp4$/i.test(name)) {
      return fail('Solo se aceptan archivos MP4.', 400, 'INVALID_FILE_TYPE');
    }

    const { client, bucket } = storage();
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'video.mp4';
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'video/mp4' }),
      { expiresIn: 900 },
    );

    return NextResponse.json(
      { key, url, expiresIn: 900 },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    console.error('upload preparation failed', error);
    if (code === 'STORAGE_NOT_CONFIGURED') {
      return fail('El almacenamiento R2 aún no está configurado en las variables de entorno del servidor.', 503, code);
    }
    return fail('No se pudo preparar la subida. Comprueba el endpoint, bucket y credenciales de R2.', 503, 'STORAGE_UNAVAILABLE');
  }
}
