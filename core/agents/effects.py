def analyze(video: dict) -> dict:
    samples=video.get('samples',[])
    return {'effects':[], 'hints': {'motion_energy': max((s.get('motion',0) for s in samples), default=0)}}
