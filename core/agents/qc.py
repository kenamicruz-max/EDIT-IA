import cv2, numpy as np

def analyze(reference_path, output_path):
    def stats(p):
        c=cv2.VideoCapture(p); vals=[]; n=int(c.get(cv2.CAP_PROP_FRAME_COUNT) or 0); fps=c.get(cv2.CAP_PROP_FPS) or 30
        for i in np.linspace(0,max(0,n-1),min(30,max(1,n))).astype(int):
            c.set(cv2.CAP_PROP_POS_FRAMES,int(i)); ok,f=c.read()
            if ok: vals.append(float(np.mean(f)))
        d=n/fps if fps else 0; c.release(); return d,float(np.mean(vals)) if vals else 0
    rd,rb=stats(reference_path); od,ob=stats(output_path)
    return {'duration_delta':od-rd,'brightness_delta':ob-rb,'score':max(0.0,1.0-abs(od-rd)/max(1,rd)-abs(ob-rb)/255)}
