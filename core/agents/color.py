import numpy as np


def analyze(video: dict) -> dict:
    samples = video.get('samples', [])
    if not samples:
        return {'brightness': 0.0, 'saturation': 0.0, 'contrast': 0.0, 'temperature': 0.0}
    return {
        'brightness': float(np.mean([x.get('brightness', 0) for x in samples])),
        'saturation': float(np.mean([x.get('saturation', 0) for x in samples])),
        'contrast': float(np.mean([x.get('contrast', 0) for x in samples])),
        'temperature': 0.0,
    }


def match_grade(reference: dict, source: dict) -> dict:
    rb, sb = float(reference.get('brightness', 0)), float(source.get('brightness', 0))
    rs, ss = float(reference.get('saturation', 0)), float(source.get('saturation', 0))
    rc, sc = float(reference.get('contrast', 0)), float(source.get('contrast', 0))
    return {
        'brightness_delta': rb - sb,
        'saturation_multiplier': max(0.5, min(2.0, rs / max(1.0, ss))),
        'contrast_multiplier': max(0.5, min(2.0, rc / max(1.0, sc))),
    }
