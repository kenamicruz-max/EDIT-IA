from core.agents import audio, video, effects, transitions, text, vision, color, motion, source_matcher, master_editor, qc, autocorrect
from core.render.ffmpeg_renderer import render
import os


def run(reference_path, source_path, output_path, max_iterations=3):
    reference = {'audio': audio.analyze(reference_path), 'video': video.analyze(reference_path)}
    source = {'audio': audio.analyze(source_path), 'video': video.analyze(source_path)}
    for analysis in (reference, source):
        v = analysis['video']
        analysis.update({
            'effects': effects.analyze(v),
            'transitions': transitions.analyze(v),
            'text': text.analyze(v),
            'vision': vision.analyze(v),
            'color': color.analyze(v),
            'motion': motion.analyze(v),
        })
    spec = master_editor.build(reference, source)
    grade = color.match_grade(reference['color'], source['color'])
    for segment in spec['segments']:
        segment.update(grade)
    matches = source_matcher.match(spec['segments'], source_path, source['video'])
    spec = master_editor.adapt(spec, source['video'], matches)
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    best = None
    for iteration in range(max_iterations):
        render(spec, source_path, output_path)
        q = qc.analyze(reference_path, output_path)
        q['iteration'] = iteration + 1
        best = q
        if q['score'] >= 0.95:
            break
        patch = autocorrect.suggest(q)
        if not patch:
            break
        for segment in spec['segments']:
            segment.update(patch)
    return {'spec': spec, 'qc': best, 'output': output_path}
