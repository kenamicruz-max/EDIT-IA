import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '../../../lib/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 500 * 1024 * 1024;

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

    const { client, bucket } = storageConfig();
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'video.mp4';
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: 'video/mp4',
      }),
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
    if (code === 'STORAGE_ENDPOINT_INVALID') {
      return fail('El endpoint de R2 no es válido. Debe ser el endpoint S3 de tu cuenta de Cloudflare R2.', 503, code);
    }
    return fail('No se pudo preparar la subida. Comprueba el endpoint, bucket y credenciales de R2.', 503, 'STORAGE_UNAVAILABLE');
  }
}
