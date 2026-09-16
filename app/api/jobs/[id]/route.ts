import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'edit-ia-media';
const env = (name: string) => process.env[name]?.trim().replace(/^['\"]|['\"]$/g, '') || '';
const JOB_ID = /^[0-9a-f-]{36}$/i;

function storage() {
  const endpointRaw = env('STORAGE_ENDPOINT');
  const accessKey = env('STORAGE_ACCESS_KEY');
  const secretKey = env('STORAGE_SECRET_KEY');
  if (!endpointRaw || !accessKey || !secretKey) throw new Error('Storage is not configured');
  const endpoint = /^https?:\/\//i.test(endpointRaw) ? endpointRaw : `https://${endpointRaw}`;
  return new S3Client({ region: env('STORAGE_REGION') || 'auto', endpoint, forcePathStyle: true, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!JOB_ID.test(params.id)) return NextResponse.json({ error: 'El identificador del trabajo no es válido.' }, { status: 400 });
  try {
    const client = storage();
    const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: `jobs/${params.id}.json` }));
    const text = await result.Body?.transformToString();
    if (!text) return NextResponse.json({ error: 'El estado del trabajo está vacío.' }, { status: 502 });
    const data = JSON.parse(text);
    const progressNumber = Number(data.progress);
    return NextResponse.json({
      id: data.id,
      status: data.status || 'QUEUED',
      stage: data.stage || null,
      progress: Number.isFinite(progressNumber) ? Math.max(0, Math.min(100, progressNumber)) : null,
      detail: data.detail || null,
      output: data.output || null,
      qc: data.qc || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
      finishedAt: data.finishedAt || null,
      error: typeof data.error === 'string' ? data.error.slice(0, 500) : null,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/NoSuchKey|NotFound|404/i.test(message)) return NextResponse.json({ error: 'No se encontró el trabajo.' }, { status: 404 });
    console.error('job status lookup failed', error);
    return NextResponse.json({ error: 'No se pudo consultar el estado del trabajo.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
