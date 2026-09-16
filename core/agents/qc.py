import math

from core.agents import audio, video


def _mean(samples, key):
    values = [float(s.get(key, 0.0)) for s in samples]
    return sum(values) / len(values) if values else 0.0


def _exp_score(delta, scale):
    return math.exp(-abs(float(delta)) / max(0.001, scale))


def _cut_timing_score(reference_cuts, output_cuts):
    if not reference_cuts:
        return 1.0 if not output_cuts else 0.5
    if not output_cuts:
        return 0.0
    errors = []
    for cut in reference_cuts:
        nearest = min(abs(float(cut) - float(other)) for other in output_cuts)
        errors.append(min(1.0, nearest / 0.35))
    return max(0.0, 1.0 - sum(errors) / len(errors))


def analyze(reference_path, output_path):
    ref_v = video.analyze(reference_path)
    out_v = video.analyze(output_path)
    ref_a = audio.analyze(reference_path)
    out_a = audio.analyze(output_path)

    rd = float(ref_v.get('duration', 0.0))
    od = float(out_v.get('duration', 0.0))
    duration_delta = od - rd
    brightness_delta = _mean(out_v.get('samples', []), 'brightness') - _mean(ref_v.get('samples', []), 'brightness')
    saturation_delta = _mean(out_v.get('samples', []), 'saturation') - _mean(ref_v.get('samples', []), 'saturation')
    contrast_delta = _mean(out_v.get('samples', []), 'contrast') - _mean(ref_v.get('samples', []), 'contrast')
    motion_delta = _mean(out_v.get('samples', []), 'motion') - _mean(ref_v.get('samples', []), 'motion')
    ref_cuts = ref_v.get('cuts', [])
    out_cuts = out_v.get('cuts', [])
    cut_count_score = 1.0 - min(1.0, abs(len(out_cuts) - len(ref_cuts)) / max(1, len(ref_cuts)))
    cut_timing_score = _cut_timing_score(ref_cuts, out_cuts)
    audio_duration_delta = float(out_a.get('duration', 0.0)) - float(ref_a.get('duration', 0.0))

    scores = {
        'duration': max(0.0, 1.0 - abs(duration_delta) / max(0.5, rd)),
        'brightness': _exp_score(brightness_delta, 35.0),
        'saturation': _exp_score(saturation_delta, 40.0),
        'contrast': _exp_score(contrast_delta, 20.0),
        'motion': _exp_score(motion_delta, 18.0),
        'cut_count': max(0.0, cut_count_score),
        'cut_timing': cut_timing_score,
        'audio_duration': max(0.0, 1.0 - abs(audio_duration_delta) / max(0.5, float(ref_a.get('duration', 0.0) or 1.0))),
    }
    weights = {'duration': 0.16, 'brightness': 0.08, 'saturation': 0.08, 'contrast': 0.08, 'motion': 0.14, 'cut_count': 0.16, 'cut_timing': 0.18, 'audio_duration': 0.12}
    score = sum(scores[k] * weights[k] for k in weights)

    return {
        'duration_delta': duration_delta,
        'brightness_delta': brightness_delta,
        'saturation_delta': saturation_delta,
        'contrast_delta': contrast_delta,
        'motion_delta': motion_delta,
        'audio_duration_delta': audio_duration_delta,
        'reference_cut_count': len(ref_cuts),
        'output_cut_count': len(out_cuts),
        'cut_timing_score': round(cut_timing_score, 4),
        'component_scores': {k: round(v, 4) for k, v in scores.items()},
        'score': round(max(0.0, min(1.0, score)), 4),
    }
