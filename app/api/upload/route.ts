import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const MAX=500*1024*1024;
function storage(){const bucket=process.env.STORAGE_BUCKET;if(!bucket)throw new Error('STORAGE_BUCKET is not configured');return {bucket,client:new S3Client({region:process.env.STORAGE_REGION||'auto',endpoint:process.env.STORAGE_ENDPOINT||undefined,credentials:{accessKeyId:process.env.STORAGE_ACCESS_KEY||'',secretAccessKey:process.env.STORAGE_SECRET_KEY||''}})};}
export async function POST(req:Request){try{const b=await req.json();const name=String(b?.name||'video.mp4'),size=Number(b?.size||0),type=String(b?.type||'video/mp4');if(!size||size>MAX)return NextResponse.json({error:'File too large or invalid'},{status:413});if(!type.startsWith('video/'))return NextResponse.json({error:'Only video files are accepted'},{status:400});const {bucket,client}=storage();const key=`uploads/${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const url=await getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:type}),{expiresIn:900});return NextResponse.json({key,url});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Upload setup failed'},{status:500});}}
