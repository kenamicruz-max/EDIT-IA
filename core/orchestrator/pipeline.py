from concurrent.futures import ThreadPoolExecutor, as_completed
from core.agents import audio, video, effects, transitions, text, vision, color, motion, source_matcher, master_editor, qc, autocorrect
from core.render.ffmpeg_renderer import render
import os


def run(reference_path, source_path, output_path, max_iterations=3, progress=None):
    def report(stage, percent, detail=''):
        if progress:
            progress(stage, percent, detail)

    report('ANALYSIS_START', 4, 'Starting parallel reference and source analysis')
    analysis_jobs = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for key, fn, path in (
            ('reference_audio', audio.analyze, reference_path),
            ('reference_video', video.analyze, reference_path),
            ('source_audio', audio.analyze, source_path),
            ('source_video', video.analyze, source_path),
        ):
            analysis_jobs[pool.submit(fn, path)] = key
        results = {}
        for future in as_completed(analysis_jobs):
            key = analysis_jobs[future]
            results[key] = future.result()
            report('ANALYSIS_PROGRESS', 20, f'Finished {key.replace("_", " ")}')

    reference = {'audio': results['reference_audio'], 'video': results['reference_video']}
    source = {'audio': results['source_audio'], 'video': results['source_video']}

    specialists = (
        ('effects', effects),
        ('transitions', transitions),
        ('text', text),
        ('vision', vision),
        ('color', color),
        ('motion', motion),
    )
    report('SPECIALISTS_START', 22, 'Running specialized analyzers in parallel')
    specialist_jobs = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for owner, analysis in (('reference', reference), ('source', source)):
            for name, specialist in specialists:
                specialist_jobs[pool.submit(specialist.analyze, analysis['video'])] = (owner, name)
        completed = 0
        total = len(specialist_jobs)
        for future in as_completed(specialist_jobs):
            owner, name = specialist_jobs[future]
            target = reference if owner == 'reference' else source
            try:
                target[name] = future.result()
            except Exception as exc:
                # Optional specialists must not destroy an otherwise valid edit.
                target[name] = {'error': str(exc)}
            completed += 1
            percent = 22 + int((completed / total) * 23)
            report('SPECIALISTS_PROGRESS', percent, f'{owner.title()} {name} specialist completed ({completed}/{total})')

    report('MASTER_SPEC', 47, 'Building the edit specification')
    spec = master_editor.build(reference, source)
    report('COLOR_MATCH', 51, 'Matching the visual grade')
    grade = color.match_grade(reference.get('color', {}), source.get('color', {}))
    for segment in spec['segments']:
        segment.update(grade)

    report('SOURCE_MATCH', 59, 'Finding the best source moments')
    matches = source_matcher.match(spec['segments'], source_path, source['video'])
    if len(matches) != len(spec['segments']):
        raise RuntimeError(f'Source matcher returned {len(matches)} matches for {len(spec["segments"])} edit segments')
    spec = master_editor.adapt(spec, source['video'], matches)
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    best = None
    for iteration in range(max(1, int(max_iterations))):
        n = iteration + 1
        report('RENDER', 63 + iteration * 9, f'Rendering iteration {n} of {max_iterations}')
        render(spec, source_path, output_path, reference_path=reference_path)
        report('QC', 72 + iteration * 8, f'Checking render iteration {n}')
        q = qc.analyze(reference_path, output_path)
        q['iteration'] = n
        best = q
        if q.get('score', 0.0) >= 0.95:
            report('QC_PASSED', 96, f'Quality target reached: {q["score"]:.3f}')
            break
        patch = autocorrect.suggest(q)
        if not patch:
            report('QC_ACCEPTED', 96, 'No safe automatic correction available')
            break
        report('AUTOCORRECT', 90, f'Applying automatic correction after iteration {n}')
        for segment in spec['segments']:
            segment.update(patch)

    report('COMPLETED', 100, 'Render and quality control completed')
    return {'spec': spec, 'qc': best, 'output': output_path}
