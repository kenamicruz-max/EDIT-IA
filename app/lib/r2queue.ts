import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const e = (n: string) => process.env[n]?.trim().replace(/^['\"]|['\"]$/g, '') || '';
const DEFAULT_BUCKET = 'edit-ia-media';
const MAX = 500 * 1024 * 1024;
type Input = { reference: string; source: string; referenceSize: number; sourceSize: number; characterId: string; styleId: string };

export async function enqueue(input: Input) {
  const miss = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'].filter(n => !e(n));
  if (miss.length) throw new Error(`Storage runtime configuration is missing: ${miss.join(', ')}`);
  const bucket = e('STORAGE_BUCKET') || DEFAULT_BUCKET;
  if (!/^uploads\/[A-Za-z0-9._/-]+$/.test(input.reference) || !/^uploads\/[A-Za-z0-9._/-]+$/.test(input.source)) throw new Error('Invalid upload key');
  if (!Number.isSafeInteger(input.referenceSize) || !Number.isSafeInteger(input.sourceSize) || input.referenceSize <= 0 || input.sourceSize <= 0 || input.referenceSize > MAX || input.sourceSize > MAX) throw new Error('Invalid video size');
  if (!/^[a-z0-9-]{1,64}$/.test(input.characterId) || !/^[a-z0-9-]{1,64}$/.test(input.styleId)) throw new Error('Invalid selection');
  const raw = e('STORAGE_ENDPOINT'), endpoint = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const c = new S3Client({ region: e('STORAGE_REGION') || 'auto', endpoint, forcePathStyle: true, credentials: { accessKeyId: e('STORAGE_ACCESS_KEY'), secretAccessKey: e('STORAGE_SECRET_KEY') } });
  const id = crypto.randomUUID();
  const job = { id, status: 'QUEUED', stage: 'QUEUED', progress: null, detail: 'Trabajo creado. Esperando al worker.', reference: input.reference, source: input.source, referenceSize: input.referenceSize, sourceSize: input.sourceSize, characterId: input.characterId, styleId: input.styleId, createdAt: new Date().toISOString(), version: '6.0.0' };
  await c.send(new PutObjectCommand({ Bucket: bucket, Key: `jobs/${id}.json`, Body: JSON.stringify(job), ContentType: 'application/json', CacheControl: 'no-store' }));
  return { id, status: 'QUEUED', stage: 'QUEUED', progress: null, version: '6.0.0' };
}
