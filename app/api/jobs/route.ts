import { NextResponse } from 'next/server';
import { enqueue } from '../../lib/r2queue';
import { characters } from '../../../data/characters';
import { editStyles } from '../../../data/styles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 500 * 1024 * 1024;
const keyPattern = /^uploads\/[A-Za-z0-9._/-]+$/;
const idPattern = /^[a-z0-9-]{1,64}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reference = String(body?.reference || '');
    const source = String(body?.source || '');
    const referenceSize = Number(body?.referenceSize || 0);
    const sourceSize = Number(body?.sourceSize || 0);
    const characterId = String(body?.characterId || '');
    const styleId = String(body?.styleId || '');

    if (!keyPattern.test(reference) || !keyPattern.test(source)) {
      return NextResponse.json({ error: 'Los archivos subidos no son válidos.' }, { status: 400 });
    }
    if (![referenceSize, sourceSize].every(Number.isSafeInteger) || referenceSize <= 0 || sourceSize <= 0 || referenceSize > MAX || sourceSize > MAX) {
      return NextResponse.json({ error: 'El tamaño de los vídeos no es válido.' }, { status: 413 });
    }
    if (!idPattern.test(characterId) || !characters.some((item) => item.id === characterId && item.enabled)) {
      return NextResponse.json({ error: 'El personaje seleccionado no es válido.' }, { status: 400 });
    }
    if (!idPattern.test(styleId) || !editStyles.some((item) => item.id === styleId && item.enabled)) {
      return NextResponse.json({ error: 'El estilo seleccionado no es válido.' }, { status: 400 });
    }

    const job = await enqueue({ reference, source, referenceSize, sourceSize, characterId, styleId });
    return NextResponse.json(job, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('job creation failed', error);
    return NextResponse.json({ error: 'No se pudo crear el trabajo. Comprueba la configuración del servidor.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
