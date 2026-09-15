import numpy as np

def analyze(video: dict) -> dict:
    s=video.get('samples',[]); b=float(np.mean([x.get('brightness',0) for x in s])) if s else 0
    return {'brightness':b,'saturation':1.0,'contrast':1.0,'temperature':0.0}

def match_grade(reference: dict, source: dict) -> dict:
    rb=reference.get('brightness',0); sb=source.get('brightness',0)
    return {'brightness_delta':rb-sb,'saturation_multiplier':1.0}
