def build(reference_analysis, source_analysis):
    cuts=sorted(set([0.0]+[float(x) for x in reference_analysis.get('video',{}).get('cuts',[]) ]))
    refdur=float(reference_analysis.get('video',{}).get('duration',0) or 0)
    if refdur and (not cuts or cuts[-1] < refdur): cuts.append(refdur)
    segments=[{'start':cuts[i],'end':cuts[i+1],'motion':0} for i in range(len(cuts)-1) if cuts[i+1]>cuts[i]]
    return {'version':'1.0','duration':refdur,'segments':segments}

def adapt(spec, source_analysis, matches):
    out=dict(spec); segs=[]
    for seg,m in zip(spec.get('segments',[]),matches):
        x=dict(seg); x['source_start']=m['source_start']; x['source_end']=m['source_end']; segs.append(x)
    out['segments']=segs; out['source_duration']=source_analysis.get('duration',0); return out
