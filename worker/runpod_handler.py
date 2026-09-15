import os,tempfile,traceback,requests,boto3
try: import runpod
except ImportError: runpod=None
from core.orchestrator.pipeline import run

def download(url,path):
    with requests.get(url,stream=True,timeout=1200) as r:
        r.raise_for_status()
        with open(path,'wb') as f:
            for c in r.iter_content(1024*1024):
                if c:f.write(c)

def handler(job):
    inp=job.get('input',{}) if isinstance(job,dict) else {}
    ref,src=inp.get('reference'),inp.get('source'); cfg=inp.get('storage') or {}
    if not ref or not src:return {'status':'failed','error':'reference and source are required'}
    try:
        w=tempfile.mkdtemp(prefix='editia-'); rp=os.path.join(w,'reference.mp4'); sp=os.path.join(w,'source.mp4'); out=os.path.join(w,'output.mp4')
        download(ref,rp); download(src,sp); result=run(rp,sp,out)
        if cfg.get('bucket') and cfg.get('access_key') and cfg.get('secret_key'):
            s3=boto3.client('s3',region_name=cfg.get('region') or 'auto',endpoint_url=cfg.get('endpoint') or None,aws_access_key_id=cfg['access_key'],aws_secret_access_key=cfg['secret_key'])
            key=f"outputs/{job.get('id','job')}.mp4"; s3.upload_file(out,cfg['bucket'],key,ExtraArgs={'ContentType':'video/mp4'})
            url=s3.generate_presigned_url('get_object',Params={'Bucket':cfg['bucket'],'Key':key},ExpiresIn=86400)
            return {'status':'completed','output':url,'output_key':key,'qc':result.get('qc'),'spec':result.get('spec')}
        return {'status':'completed','output':out,'qc':result.get('qc'),'spec':result.get('spec')}
    except Exception as e:return {'status':'failed','error':str(e),'traceback':traceback.format_exc()}

if runpod: runpod.serverless.start({'handler':handler})