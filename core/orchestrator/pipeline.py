from core.agents import audio,video,effects,transitions,text,vision,color,motion,source_matcher,master_editor,qc,autocorrect
from core.render.ffmpeg_renderer import render
import json, os

def run(reference_path, source_path, output_path, max_iterations=2):
    ra={'audio':audio.analyze(reference_path),'video':video.analyze(reference_path)}
    sa={'audio':audio.analyze(source_path),'video':video.analyze(source_path)}
    ra.update({'effects':effects.analyze(ra['video']),'transitions':transitions.analyze(ra['video']),'text':text.analyze(ra['video']),'vision':vision.analyze(ra['video']),'color':color.analyze(ra['video']),'motion':motion.analyze(ra['video'])})
    sa.update({'effects':effects.analyze(sa['video']),'transitions':transitions.analyze(sa['video']),'text':text.analyze(sa['video']),'vision':vision.analyze(sa['video']),'color':color.analyze(sa['video']),'motion':motion.analyze(sa['video'])})
    spec=master_editor.build(ra,sa); matches=source_matcher.match(spec['segments'],source_path,sa['video']); spec=master_editor.adapt(spec,sa['video'],matches)
    os.makedirs(os.path.dirname(output_path) or '.',exist_ok=True)
    best=None
    for _ in range(max_iterations):
        render(spec,source_path,output_path); q=qc.analyze(reference_path,output_path); best=q
        if q['score']>=.95: break
        patch=autocorrect.suggest(q)
        if 'brightness_delta' in patch:
            for seg in spec['segments']: seg['brightness_delta']=patch['brightness_delta']
        else: break
    return {'spec':spec,'qc':best,'output':output_path}
