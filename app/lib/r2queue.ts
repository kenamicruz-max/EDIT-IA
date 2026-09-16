import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { storageConfig } from './r2';

const MAX = 500 * 1024 * 1024;
type Input = { reference: string; source: string; referenceSize: number; sourceSize: number; characterId: string; styleId: string };

export async function enqueue(input: Input) {
  const { client, bucket } = storageConfig();
  if (!/^uploads\/[A-Za-z0-9._/-]+$/.test(input.reference) || !/^uploads\/[A-Za-z0-9._/-]+$/.test(input.source)) throw new Error('Invalid upload key');
  if (!Number.isSafeInteger(input.referenceSize) || !Number.isSafeInteger(input.sourceSize) || input.referenceSize <= 0 || input.sourceSize <= 0 || input.referenceSize > MAX || input.sourceSize > MAX) throw new Error('Invalid video size');
  if (!/^[a-z0-9-]{1,64}$/.test(input.characterId) || !/^[a-z0-9-]{1,64}$/.test(input.styleId)) throw new Error('Invalid selection');
  const id = crypto.randomUUID();
  const job = {
    id,
    status: 'QUEUED',
    stage: 'QUEUED',
    progress: null,
    detail: 'Trabajo creado. Esperando al worker.',
    reference: input.reference,
    source: input.source,
    referenceSize: input.referenceSize,
    sourceSize: input.sourceSize,
    characterId: input.characterId,
    styleId: input.styleId,
    createdAt: new Date().toISOString(),
    version: '6.0.0',
  };
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `jobs/${id}.json`,
    Body: JSON.stringify(job),
    ContentType: 'application/json',
    CacheControl: 'no-store',
  }));
  return { id, status: 'QUEUED', stage: 'QUEUED', progress: null, version: '6.0.0' };
}
