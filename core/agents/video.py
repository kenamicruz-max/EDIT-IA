import cv2, numpy as np

def analyze(path: str) -> dict:
    cap=cv2.VideoCapture(path); fps=cap.get(cv2.CAP_PROP_FPS) or 30; n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0); dur=n/fps if fps else 0
    samples=min(720,max(1,int(dur*2)))
    frames=[]; cuts=[]; prev=None
    for i in range(samples):
        cap.set(cv2.CAP_PROP_POS_MSEC, (dur*1000*i/max(1,samples-1)))
        ok,frame=cap.read()
        if not ok: continue
        small=cv2.resize(frame,(160,90)); gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY); score=float(np.mean(cv2.absdiff(gray,prev))) if prev is not None else 0
        if score>22 and i>0: cuts.append((i/max(1,samples-1))*dur)
        frames.append({'t':(i/max(1,samples-1))*dur,'brightness':float(np.mean(small)),'motion':score}); prev=gray
    cap.release()
    return {'duration':dur,'fps':fps,'width':int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0),'height':int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0),'cuts':cuts,'samples':frames}
