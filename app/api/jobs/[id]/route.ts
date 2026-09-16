import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { storageConfig } from '../../../../lib/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JOB_ID = /^[0-9a-f-]{36}$/i;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!JOB_ID.test(params.id)) return NextResponse.json({ error: 'El identificador del trabajo no es válido.' }, { status: 400 });
  try {
    const { client, bucket } = storageConfig();
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `jobs/${params.id}.json` }));
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
