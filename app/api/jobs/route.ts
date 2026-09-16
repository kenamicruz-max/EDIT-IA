import { NextResponse } from 'next/server';
import { enqueue } from '../../lib/r2queue';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(req:Request){
  try{
    const b=await req.json();
    const reference=String(b?.reference||''); const source=String(b?.source||'');
    const referenceSize=Number(b?.referenceSize||0); const sourceSize=Number(b?.sourceSize||0);
    const characterId=String(b?.characterId||''); const styleId=String(b?.styleId||'');
    if(!reference||!source||!characterId||!styleId) return NextResponse.json({error:'Faltan datos para crear el trabajo.'},{status:400});
    const r=await enqueue({reference,source,referenceSize,sourceSize,characterId,styleId});
    return NextResponse.json(r,{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(x){return NextResponse.json({error:x instanceof Error?x.message:'No se pudo crear el trabajo.'},{status:500,headers:{'Cache-Control':'no-store'}})}
}
