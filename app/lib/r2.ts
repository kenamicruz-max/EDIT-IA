import { S3Client } from '@aws-sdk/client-s3';

const DEFAULT_BUCKET = 'edit-ia-media';

export const cleanStorageEnv = (name: string) =>
  process.env[name]?.trim().replace(/^['\"]|['\"]$/g, '') || '';

export function storageConfig() {
  const endpointRaw = cleanStorageEnv('STORAGE_ENDPOINT');
  const accessKey = cleanStorageEnv('STORAGE_ACCESS_KEY');
  const secretKey = cleanStorageEnv('STORAGE_SECRET_KEY');
  const bucket = cleanStorageEnv('STORAGE_BUCKET') || DEFAULT_BUCKET;
  const missing = [
    ['STORAGE_ENDPOINT', endpointRaw],
    ['STORAGE_ACCESS_KEY', accessKey],
    ['STORAGE_SECRET_KEY', secretKey],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    const error = new Error(`Missing storage configuration: ${missing.join(', ')}`) as Error & { code?: string };
    error.code = 'STORAGE_NOT_CONFIGURED';
    throw error;
  }

  const endpoint = (/^https?:\/\//i.test(endpointRaw) ? endpointRaw : `https://${endpointRaw}`).replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    const error = new Error('STORAGE_ENDPOINT is not a valid URL') as Error & { code?: string };
    error.code = 'STORAGE_ENDPOINT_INVALID';
    throw error;
  }
  if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname.endsWith('.r2.cloudflarestorage.com')) {
    const error = new Error('STORAGE_ENDPOINT must be a Cloudflare R2 S3 endpoint') as Error & { code?: string };
    error.code = 'STORAGE_ENDPOINT_INVALID';
    throw error;
  }

  return {
    bucket,
    endpoint: parsed.toString().replace(/\/$/, ''),
    client: new S3Client({
      region: cleanStorageEnv('STORAGE_REGION') || 'auto',
      endpoint: parsed.toString().replace(/\/$/, ''),
      // Keep the same path-style addressing used by the worker and status route.
      // This also matches Cloudflare's R2-compatible presigning examples.
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    }),
  };
}

export { DEFAULT_BUCKET };
