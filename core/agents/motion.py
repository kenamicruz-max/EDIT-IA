def analyze(video: dict) -> dict:
    s=video.get('samples',[])
    return {'average_motion':sum(x.get('motion',0) for x in s)/len(s) if s else 0,'segments':[]}
