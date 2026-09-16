import numpy as np


def analyze(video: dict) -> dict:
    samples = video.get('samples', [])
    cuts = [float(t) for t in video.get('cuts', [])]
    if not cuts:
        return {'transitions': []}
    transitions = []
    for t in cuts:
        before = [s for s in samples if t - 0.35 <= float(s.get('t', 0.0)) < t]
        after = [s for s in samples if t <= float(s.get('t', 0.0)) <= t + 0.35]
        bm = float(np.mean([s.get('motion', 0) for s in before])) if before else 0.0
        am = float(np.mean([s.get('motion', 0) for s in after])) if after else 0.0
        bb = float(np.mean([s.get('brightness', 0) for s in before])) if before else 0.0
        ab = float(np.mean([s.get('brightness', 0) for s in after])) if after else 0.0
        delta_motion = abs(am - bm)
        delta_brightness = abs(ab - bb)
        if delta_brightness > 55:
            kind = 'flash_cut_candidate'
        elif max(bm, am) > 28 and delta_motion > 12:
            kind = 'motion_cut_candidate'
        else:
            kind = 'cut'
        transitions.append({'time': round(t, 4), 'type': kind, 'duration': 0.0, 'motion_delta': round(delta_motion, 3), 'brightness_delta': round(delta_brightness, 3)})
    return {'transitions': transitions[:500]}
