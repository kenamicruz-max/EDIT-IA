def _mean_features(samples, start, end):
    xs = [s for s in samples if start <= s.get('t', 0) <= end]
    if not xs:
        return {'motion': 0.0, 'brightness': 0.0, 'saturation': 0.0, 'contrast': 0.0}
    return {k: sum(float(s.get(k, 0)) for s in xs) / len(xs) for k in ('motion', 'brightness', 'saturation', 'contrast')}


def _snap_to_beat(time, beats, tolerance=0.12):
    if not beats:
        return time
    nearest = min(beats, key=lambda b: abs(float(b) - time))
    return float(nearest) if abs(float(nearest) - time) <= tolerance else time


def _effects_for_segment(analysis, start, end):
    effects = analysis.get('effects', {}).get('effects', [])
    selected = [e for e in effects if start - 0.08 <= float(e.get('time', 0)) <= end + 0.08]
    shake = max((float(e.get('strength', 0)) for e in selected if 'shake' in str(e.get('type', ''))), default=0.0)
    flash = max((float(e.get('strength', 0)) for e in selected if 'flash' in str(e.get('type', ''))), default=0.0)
    return {'shake': round(min(1.0, shake), 3), 'flash': round(min(1.0, flash), 3)}


def build(reference_analysis, source_analysis):
    video = reference_analysis.get('video', {})
    audio = reference_analysis.get('audio', {})
    beats = [float(x) for x in audio.get('beats', [])]
    cuts = sorted(set([0.0] + [float(x) for x in video.get('cuts', []) if float(x) > 0]))
    refdur = float(video.get('duration', 0) or 0)
    snapped = [0.0]
    for cut in cuts[1:]:
        if cut < refdur - 0.05:
            snapped.append(_snap_to_beat(cut, beats))
    if refdur > 0:
        snapped.append(refdur)
    cuts = sorted(set(round(max(0.0, min(refdur, x)), 4) for x in snapped))
    samples = video.get('samples', [])
    segments = []
    for i in range(len(cuts) - 1):
        start, end = cuts[i], cuts[i + 1]
        if end <= start:
            continue
        f = _mean_features(samples, start, end)
        fx = _effects_for_segment(reference_analysis, start, end)
        motion_norm = max(0.0, min(1.0, f['motion'] / 40.0))
        segments.append({'start': start, 'end': end, 'duration': end - start, 'features': f, 'brightness': f['brightness'], 'saturation': f['saturation'], 'contrast': f['contrast'], 'motion': f['motion'], 'brightness_delta': 0.0, 'saturation_multiplier': 1.0, 'contrast_multiplier': 1.0, 'speed': 1.0, 'zoom': round(1.0 + 0.08 * motion_norm, 4), 'shake': fx['shake'], 'flash': fx['flash']})
    return {'version': '1.3', 'duration': refdur, 'segments': segments, 'reference_grade': reference_analysis.get('color', {}), 'audio': audio, 'source_duration': source_analysis.get('video', {}).get('duration', 0)}


def adapt(spec, source_analysis, matches):
    out = dict(spec)
    segs = []
    for seg, match in zip(spec.get('segments', []), matches):
        x = dict(seg)
        x.update({'source_start': match['source_start'], 'source_end': match['source_end'], 'match_score': match.get('score', 0.0), 'speed': match.get('speed', 1.0)})
        segs.append(x)
    out['segments'] = segs
    out['source_duration'] = source_analysis.get('duration', 0)
    return out
