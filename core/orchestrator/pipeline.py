from core.agents import audio, video, effects, transitions, text, vision, color, motion, source_matcher, master_editor, qc, autocorrect
from core.render.ffmpeg_renderer import render
import os


def run(reference_path, source_path, output_path, max_iterations=3, progress=None):
    def report(stage, percent, detail=''):
        if progress:
            progress(stage, percent, detail)

    report('AUDIO_REFERENCE', 5, 'Analyzing reference audio')
    reference_audio = audio.analyze(reference_path)
    report('VIDEO_REFERENCE', 10, 'Analyzing reference video')
    reference_video = video.analyze(reference_path)
    report('AUDIO_SOURCE', 15, 'Analyzing source audio')
    source_audio = audio.analyze(source_path)
    report('VIDEO_SOURCE', 20, 'Analyzing source video')
    source_video = video.analyze(source_path)

    reference = {'audio': reference_audio, 'video': reference_video}
    source = {'audio': source_audio, 'video': source_video}

    specialists = (
        ('EFFECTS', effects),
        ('TRANSITIONS', transitions),
        ('TEXT', text),
        ('VISION', vision),
        ('COLOR', color),
        ('MOTION', motion),
    )
    for label, specialist in specialists:
        report(f'REFERENCE_{label}', 20, f'Analyzing reference {label.lower()}')
        reference[label.lower()] = specialist.analyze(reference_video)
        report(f'SOURCE_{label}', 20, f'Analyzing source {label.lower()}')
        source[label.lower()] = specialist.analyze(source_video)

    report('MASTER_SPEC', 45, 'Building the edit specification')
    spec = master_editor.build(reference, source)
    report('COLOR_MATCH', 50, 'Matching the visual grade')
    grade = color.match_grade(reference['color'], source['color'])
    for segment in spec['segments']:
        segment.update(grade)

    report('SOURCE_MATCH', 58, 'Finding the best source moments')
    matches = source_matcher.match(spec['segments'], source_path, source['video'])
    spec = master_editor.adapt(spec, source['video'], matches)
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    best = None
    for iteration in range(max_iterations):
        report('RENDER', 65 + iteration * 8, f'Rendering iteration {iteration + 1} of {max_iterations}')
        render(spec, source_path, output_path)
        report('QC', 72 + iteration * 8, f'Checking render iteration {iteration + 1}')
        q = qc.analyze(reference_path, output_path)
        q['iteration'] = iteration + 1
        best = q
        if q['score'] >= 0.95:
            report('QC_PASSED', 96, 'Quality target reached')
            break
        patch = autocorrect.suggest(q)
        if not patch:
            report('QC_ACCEPTED', 96, 'No safe automatic correction available')
            break
        report('AUTOCORRECT', 90, f'Applying automatic correction after iteration {iteration + 1}')
        for segment in spec['segments']:
            segment.update(patch)

    report('COMPLETED', 100, 'Render and quality control completed')
    return {'spec': spec, 'qc': best, 'output': output_path}
