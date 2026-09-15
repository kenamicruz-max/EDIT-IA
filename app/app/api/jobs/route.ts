import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.join(process.cwd(), 'runtime-jobs');
const MAX = 500 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const reference = form.get('reference');
  const source = form.get('source');
  if (!(reference instanceof File) || !(source instanceof File)) return NextResponse.json({ error: 'reference and source are required' }, { status: 400 });
  if (reference.size > MAX || source.size > MAX) return NextResponse.json({ error: 'File too large' }, { status: 413 });
  const id = crypto.randomUUID();
  const dir = path.join(ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  const refPath = path.join(dir, 'reference.mp4');
  const srcPath = path.join(dir, 'source.mp4');
  fs.writeFileSync(refPath, Buffer.from(await reference.arrayBuffer()));
  fs.writeFileSync(srcPath, Buffer.from(await source.arrayBuffer()));
  fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({ id, status: 'queued' }));
  const worker = process.env.EDIT_AI_WORKER_URL;
  if (worker) {
    fetch(worker, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, reference: refPath, source: srcPath }) }).catch(() => undefined);
  }
  return NextResponse.json({ id, status: 'queued' });
}