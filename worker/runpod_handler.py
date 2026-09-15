import os, tempfile, traceback
try: import runpod
except ImportError: runpod=None
from core.orchestrator.pipeline import run

def handler(job):
    inp=job.get('input',{}) if isinstance(job,dict) else {}
    ref=inp.get('reference'); src=inp.get('source')
    if not ref or not src: return {'status':'failed','error':'reference and source are required'}
    try:
        out=inp.get('output') or os.path.join(tempfile.gettempdir(),f"edit-{job.get('id','job')}.mp4")
        result=run(ref,src,out)
        return {'status':'completed','output':out,'qc':result.get('qc'),'spec':result.get('spec')}
    except Exception as e:
        return {'status':'failed','error':str(e),'traceback':traceback.format_exc()}

if runpod: runpod.serverless.start({'handler':handler})