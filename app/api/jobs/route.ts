import { NextResponse } from 'next/server';
import { enqueue } from '../../lib/r2queue';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(req:Request){try{const b=await req.json();const r=await enqueue({reference:String(b?.reference||''),source:String(b?.source||''),referenceSize:Number(b?.referenceSize||0),sourceSize:Number(b?.sourceSize||0)});return NextResponse.json(r,{headers:{'Cache-Control':'no-store'}});}catch(x){return NextResponse.json({error:x instanceof Error?x.message:'Job submission failed',version:'5.2.3'},{status:500,headers:{'Cache-Control':'no-store'}})}}
