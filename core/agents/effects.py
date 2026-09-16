import numpy as np


def analyze(video: dict) -> dict:
    samples = video.get('samples', [])
    if not samples:
        return {'effects': [], 'hints': {}}
    motion = np.array([float(s.get('motion', 0.0)) for s in samples], dtype=np.float32)
    brightness = np.array([float(s.get('brightness', 0.0)) for s in samples], dtype=np.float32)
    effects = []
    motion_threshold = max(float(np.percentile(motion, 90)), float(np.median(motion) * 2.0), 12.0)
    bright_hi = float(np.percentile(brightness, 96))
    bright_lo = float(np.percentile(brightness, 4))
    for i, sample in enumerate(samples):
        t = float(sample.get('t', 0.0))
        m = float(sample.get('motion', 0.0))
        b = float(sample.get('brightness', 0.0))
        if m >= motion_threshold:
            effects.append({'time': round(t, 4), 'type': 'shake_candidate', 'strength': round(min(1.0, m / max(motion_threshold, 1.0)), 3)})
        if b >= bright_hi:
            effects.append({'time': round(t, 4), 'type': 'flash_candidate', 'strength': round(min(1.0, (b - bright_hi) / max(1.0, 255.0 - bright_hi) + 0.5), 3)})
        if b <= bright_lo:
            effects.append({'time': round(t, 4), 'type': 'dark_flash_candidate', 'strength': round(min(1.0, (bright_lo - b) / max(1.0, bright_lo) + 0.5), 3)})
    return {'effects': effects[:500], 'hints': {'motion_energy': round(float(np.mean(motion)), 4), 'motion_peak': round(float(np.max(motion)), 4), 'brightness_range': [round(float(np.min(brightness)), 3), round(float(np.max(brightness)), 3)]}}
