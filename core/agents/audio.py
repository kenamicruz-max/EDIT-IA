import subprocess, json, re
from pathlib import Path

def analyze(path: str) -> dict:
    p=Path(path); duration=0.0
    try:
        out=subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(p)],text=True)
        duration=float(out.strip())
    except Exception: pass
    # Lightweight baseline; richer beat/onset extraction can be enabled with librosa.
    return {'duration':duration,'bpm':None,'beats':[],'onsets':[],'silence':[],'intensity':[]}
