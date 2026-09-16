import os
import shutil
import subprocess
import tempfile


def _atempo_chain(speed):
    speed = max(0.5, min(2.0, float(speed or 1.0)))
    filters = []
    value = speed
    while value < 0.5:
        filters.append('atempo=0.5'); value /= 0.5
    while value > 2.0:
        filters.append('atempo=2.0'); value /= 2.0
    filters.append(f'atempo={value:.6f}')
    return ','.join(filters)


def _run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)


def _has_audio(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', path], capture_output=True, text=True, check=False)
    return bool(result.stdout.strip())


def _video_filter(segment):
    speed = max(0.5, min(2.0, float(segment.get('speed', 1.0) or 1.0)))
    brightness = float(segment.get('brightness_delta', 0.0)) / 255.0
    saturation = max(0.0, min(3.0, float(segment.get('saturation_multiplier', 1.0) or 1.0)))
    contrast = max(0.5, min(2.0, float(segment.get('contrast_multiplier', 1.0) or 1.0)))
    zoom = max(1.0, min(1.18, float(segment.get('zoom', 1.0) or 1.0)))
    shake = max(0.0, min(1.0, float(segment.get('shake', 0.0) or 0.0)))
    flash = max(0.0, min(1.0, float(segment.get('flash', 0.0) or 0.0)))
    filters = [f'setpts=PTS/{speed:.6f}']
    if zoom > 1.002:
        filters.append(f'scale=ceil(iw*{zoom:.5f}/2)*2:ceil(ih*{zoom:.5f}/2)*2')
        if shake > 0.02:
            amp = 8.0 * shake
            filters.append(f'crop=iw/{zoom:.5f}:ih/{zoom:.5f}:((iw-ow)/2)+sin(t*38)*{amp:.2f}:((ih-oh)/2)+cos(t*31)*{amp:.2f}')
        else:
            filters.append(f'crop=iw/{zoom:.5f}:ih/{zoom:.5f}:(iw-ow)/2:(ih-oh)/2')
    elif shake > 0.02:
        amp = 7.0 * shake
        filters.append(f'crop=iw-2*{amp:.2f}:ih-2*{amp:.2f}:1+sin(t*38)*{amp:.2f}:1+cos(t*31)*{amp:.2f}')
    filters.append(f'eq=brightness={brightness:.6f}:contrast={contrast:.6f}:saturation={saturation:.6f}')
    if flash > 0.02:
        filters.append(f'eq=brightness={min(0.65, 0.35 + 0.3*flash):.6f}:saturation=1.08:enable=\'lt(t,0.08)\'')
    filters.append('format=yuv420p')
    return ','.join(filters)


def render(spec, source_path, output_path):
    work = tempfile.mkdtemp(prefix='editia-render-')
    clips, keep_audio = [], _has_audio(source_path)
    try:
        for i, segment in enumerate(spec.get('segments', [])):
            clip = os.path.join(work, f'{i:04d}.mp4')
            start = max(0.0, float(segment.get('source_start', 0)))
            source_len = max(0.05, float(segment.get('source_end', start + 0.05)) - start)
            target = max(0.05, float(segment.get('duration', source_len)))
            speed = max(0.5, min(2.0, float(segment.get('speed', 1.0) or 1.0)))
            vf = _video_filter(segment)
            cmd = ['ffmpeg', '-y', '-ss', f'{start:.6f}', '-i', source_path, '-t', f'{source_len:.6f}', '-vf', vf, '-r', '30', '-map', '0:v:0']
            if keep_audio:
                cmd += ['-map', '0:a:0?', '-af', _atempo_chain(speed)]
            else:
                cmd += ['-an']
            cmd += ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', f'{target:.6f}', clip]
            _run(cmd)
            clips.append(clip)
        if not clips: raise RuntimeError('No renderable segments were produced')
        concat = os.path.join(work, 'concat.txt')
        with open(concat, 'w', encoding='utf-8') as fh:
            for clip in clips: fh.write("file '" + clip.replace("'", "'\\''") + "'\n")
        _run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-movflags', '+faststart', output_path])
        return output_path
    finally:
        shutil.rmtree(work, ignore_errors=True)
