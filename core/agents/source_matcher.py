import math


def _feature(samples, start, end):
    xs = [s for s in samples if start <= s.get('t', 0) <= end]
    if not xs: return (0.0, 0.0, 0.0, 0.0)
    return tuple(sum(float(s.get(k, 0)) for s in xs) / len(xs) for k in ('motion', 'brightness', 'saturation', 'contrast'))


def _distance(a, b):
    scales = (12.0, 80.0, 80.0, 45.0)
    return math.sqrt(sum(((x - y) / s) ** 2 for x, y, s in zip(a, b, scales)))


def match(reference_segments, source_video, source_analysis):
    del source_video
    duration = float(source_analysis.get('duration', 0) or 0)
    samples = source_analysis.get('samples', [])
    if not reference_segments or duration <= 0: return []
    used, out = [], []
    for seg in reference_segments:
        target_len = max(0.05, float(seg.get('end', 0)) - float(seg.get('start', 0)))
        target = float(seg.get('start', 0)) / max(0.01, float(reference_segments[-1].get('end', 1))) * duration
        desired = (float(seg.get('motion', 0)), float(seg.get('brightness', 0)), float(seg.get('saturation', 0)), float(seg.get('contrast', 0)))
        max_start = max(0.0, duration - target_len)
        best = None
        for i in range(41):
            start = i * max_start / 40.0
            end = min(duration, start + target_len)
            dist = _distance(desired, _feature(samples, start, end))
            overlap = sum(max(0.0, min(end, u[1]) - max(start, u[0])) for u in used)
            temporal = abs(start - target) / max(0.1, duration)
            score = 1.0 / (1.0 + dist + 0.8 * overlap + 0.25 * temporal)
            if best is None or score > best[0]: best = (score, start, end)
        score, start, end = best
        used.append((start, end))
        actual_len = max(0.05, end - start)
        out.append({'source_start': start, 'source_end': end, 'score': round(score, 4), 'speed': round(max(0.5, min(2.0, actual_len / target_len)), 4)})
    return out
