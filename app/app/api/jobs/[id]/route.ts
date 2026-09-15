import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function storage() {
  const bucket = process.env.STORAGE_BUCKET;
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) throw new Error('Storage is not configured');
  return { bucket, client: new S3Client({ region: process.env.STORAGE_REGION || 'auto', endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }) };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    const { bucket, client } = storage();
    const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `jobs/${params.id}.json` }));
    const text = await r.Body?.transformToString();
    if (!text) return NextResponse.json({ error: 'Job state is empty' }, { status: 502 });
    const d = JSON.parse(text);
    return NextResponse.json({ id: d.id, status: d.status || 'QUEUED', output: d.output || null, outputKey: d.outputKey || null, qc: d.qc || null, spec: d.spec || null, error: d.error || null, createdAt: d.createdAt || null, updatedAt: d.updatedAt || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Status lookup failed';
    if (/NoSuchKey|NotFound|404/i.test(message)) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
