import numpy as np


def analyze(video: dict) -> dict:
    samples = video.get('samples', [])
    if not samples:
        return {'average_motion': 0.0, 'peaks': [], 'segments': []}
    values = np.array([float(x.get('motion', 0.0)) for x in samples], dtype=np.float32)
    baseline = float(np.median(values))
    spread = float(np.std(values))
    threshold = max(baseline + spread, baseline * 1.8, 8.0)
    peaks = []
    for i, value in enumerate(values):
        if value < threshold:
            continue
        left = values[i - 1] if i else value
        right = values[i + 1] if i + 1 < len(values) else value
        if value >= left and value >= right:
            peaks.append({'t': float(samples[i].get('t', 0.0)), 'energy': round(float(value), 3)})
    return {
        'average_motion': round(float(np.mean(values)), 4),
        'peaks': peaks[:300],
        'segments': [{'start': float(samples[max(0, i - 1)].get('t', 0.0)), 'end': float(samples[min(len(samples) - 1, i + 1)].get('t', 0.0)), 'energy': round(float(values[i]), 3)} for i in range(len(values)) if values[i] >= threshold][:300],
    }
