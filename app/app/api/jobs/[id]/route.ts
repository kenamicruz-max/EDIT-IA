import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'runtime-jobs');

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const dir = path.join(ROOT, id);
  const statusPath = path.join(dir, 'status.json');
  if (!fs.existsSync(statusPath)) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  return NextResponse.json(status);
}