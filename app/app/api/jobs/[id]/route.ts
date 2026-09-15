import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { bucket, client } = storage();
    const key = `jobs/${params.id}.json`;
    const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const text = await r.Body?.transformToString();
    if (!text) return NextResponse.json({ error: 'Job state is empty' }, { status: 502 });
    const d = JSON.parse(text);
    return NextResponse.json({
      id: d.id,
      status: d.status || 'QUEUED',
      output: d.output || null,
      outputKey: d.outputKey || null,
      qc: d.qc || null,
      spec: d.spec || null,
      error: d.error || null,
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Status lookup failed';
    if (/NoSuchKey|NotFound|404/i.test(message)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
