def _mean_features(samples, start, end):
    xs = [s for s in samples if start <= s.get('t', 0) <= end]
    if not xs: return {'motion': 0.0, 'brightness': 0.0, 'saturation': 0.0, 'contrast': 0.0}
    return {k: sum(float(s.get(k, 0)) for s in xs) / len(xs) for k in ('motion', 'brightness', 'saturation', 'contrast')}


def build(reference_analysis, source_analysis):
    video = reference_analysis.get('video', {})
    cuts = sorted(set([0.0] + [float(x) for x in video.get('cuts', []) if float(x) > 0]))
    refdur = float(video.get('duration', 0) or 0)
    if refdur > 0 and (not cuts or cuts[-1] < refdur - 0.05): cuts.append(refdur)
    cuts = [x for x in cuts if 0 <= x <= refdur]
    samples = video.get('samples', [])
    segments = []
    for i in range(len(cuts) - 1):
        start, end = cuts[i], cuts[i + 1]
        if end <= start: continue
        f = _mean_features(samples, start, end)
        segments.append({'start': start, 'end': end, 'duration': end - start, 'features': f, 'brightness': f['brightness'], 'saturation': f['saturation'], 'contrast': f['contrast'], 'motion': f['motion'], 'brightness_delta': 0.0, 'saturation_multiplier': 1.0, 'contrast_multiplier': 1.0, 'speed': 1.0})
    return {'version': '1.1', 'duration': refdur, 'segments': segments, 'reference_grade': reference_analysis.get('color', {}), 'audio': reference_analysis.get('audio', {})}


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
