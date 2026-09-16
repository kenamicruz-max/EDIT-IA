import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const e=(n:string)=>process.env[n]?.trim().replace(/^['\"]|['\"]$/g,'')||'';
const bucket=()=>e('STORAGE_BUCKET')||'editar-ia-media';
export async function enqueue(input:{reference:string;source:string;referenceSize:number;sourceSize:number}){
  const miss=['STORAGE_ENDPOINT','STORAGE_ACCESS_KEY','STORAGE_SECRET_KEY'].filter(n=>!e(n));
  if(miss.length)throw new Error(`Storage runtime configuration is missing: ${miss.join(', ')}`);
  if(!input.reference.startsWith('uploads/')||!input.source.startsWith('uploads/'))throw new Error('Invalid upload key');
  if(input.referenceSize<=0||input.sourceSize<=0||input.referenceSize>500*1024*1024||input.sourceSize>500*1024*1024)throw new Error('Invalid video size');
  const ep0=e('STORAGE_ENDPOINT'),ep=/^https?:\/\//i.test(ep0)?ep0:`https://${ep0}`;
  const c=new S3Client({region:e('STORAGE_REGION')||'auto',endpoint:ep,forcePathStyle:true,credentials:{accessKeyId:e('STORAGE_ACCESS_KEY'),secretAccessKey:e('STORAGE_'+'SECRET_KEY')}});
  const id=crypto.randomUUID();
  const job={id,status:'QUEUED',stage:'QUEUED',progress:3,detail:'Job created. Waiting for the free worker.',...input,createdAt:new Date().toISOString(),version:'5.2.8'};
  await c.send(new PutObjectCommand({Bucket:bucket(),Key:`jobs/${id}.json`,Body:JSON.stringify(job),ContentType:'application/json',CacheControl:'no-store'}));
  return{id,status:'QUEUED',stage:'QUEUED',progress:3,version:'5.2.8'};
}
