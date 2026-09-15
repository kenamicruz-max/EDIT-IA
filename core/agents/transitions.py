def analyze(video: dict) -> dict:
    cuts=video.get('cuts',[])
    return {'transitions':[{'time':t,'type':'cut','duration':0.0} for t in cuts]}
