import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const MAX = 500 * 1024 * 1024;

function storage() {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) throw new Error('STORAGE_BUCKET is not configured');
  return {
    bucket,
    client: new S3Client({
      region: process.env.STORAGE_REGION || 'auto',
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || ''
      }
    })
  };
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const reference = String(b?.reference || '');
    const source = String(b?.source || '');
    const referenceSize = Number(b?.referenceSize || 0);
    const sourceSize = Number(b?.sourceSize || 0);

    if (!reference || !source) {
      return NextResponse.json({ error: 'reference and source keys are required' }, { status: 400 });
    }
    if (!referenceSize || !sourceSize || referenceSize > MAX || sourceSize > MAX) {
      return NextResponse.json({ error: 'File too large or invalid' }, { status: 413 });
    }

    const { bucket, client } = storage();
    const id = crypto.randomUUID();
    const key = `jobs/${id}.json`;
    const job = {
      id,
      status: 'QUEUED',
      reference,
      source,
      referenceSize,
      sourceSize,
      createdAt: new Date().toISOString(),
      version: '5.1.0-max'
    };

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(job),
      ContentType: 'application/json',
      CacheControl: 'no-store'
    }));

    return NextResponse.json({ id, status: 'QUEUED' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Job submission failed' },
      { status: 500 }
    );
  }
}
