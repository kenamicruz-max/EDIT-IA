import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED = ['STORAGE_BUCKET', 'STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'] as const;

function clean(value: string | undefined) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '') || '';
}

function storage() {
  const missing = REQUIRED.filter((name) => !clean(process.env[name]));
  if (missing.length) throw new Error(`Storage runtime configuration is missing: ${missing.join(', ')}`);

  const bucket = clean(process.env.STORAGE_BUCKET);
  const rawEndpoint = clean(process.env.STORAGE_ENDPOINT);
  const endpoint = /^https?:\/\//i.test(rawEndpoint) ? rawEndpoint : `https://${rawEndpoint}`;
  const accessKeyId = clean(process.env.STORAGE_ACCESS_KEY);
  const secretAccessKey = clean(process.env.STORAGE_SECRET_KEY);
  const region = clean(process.env.STORAGE_REGION) || 'auto';

  return {
    bucket,
    client: new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const { bucket, client } = storage();
    const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `jobs/${params.id}.json` }));
    const text = await r.Body?.transformToString();
    if (!text) return NextResponse.json({ error: 'Job state is empty' }, { status: 502 });

    const d = JSON.parse(text);
    return NextResponse.json(
      {
        id: d.id,
        status: d.status || 'QUEUED',
        output: d.output || null,
        outputKey: d.outputKey || null,
        qc: d.qc || null,
        spec: d.spec || null,
        error: d.error || null,
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
        version: '5.2.3',
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Status lookup failed';
    if (/NoSuchKey|NotFound|404/i.test(message)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: message, version: '5.2.3' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
