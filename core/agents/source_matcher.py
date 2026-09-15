def match(reference_segments, source_video, source_analysis):
    dur=source_analysis.get('duration',0) or 0
    out=[]; used=set()
    for i,seg in enumerate(reference_segments):
        length=max(0.05,float(seg.get('end',0))-float(seg.get('start',0)))
        target=(float(seg.get('start',0))/max(0.01,float(reference_segments[-1].get('end',1))))*dur if reference_segments else 0
        candidates=[max(0,min(dur-length,target+d)) for d in (-dur*.25,-dur*.1,0,dur*.1,dur*.25)]
        start=min(candidates,key=lambda x: (abs(x-target), x in used))
        key=round(start,2)
        used.add(key); out.append({'source_start':start,'source_end':min(dur,start+length),'score':1.0})
    return out
