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
            brightness = float(segment.get('brightness_delta', 0.0)) / 255.0
            saturation = max(0.0, min(3.0, float(segment.get('saturation_multiplier', 1.0) or 1.0)))
            contrast = max(0.5, min(2.0, float(segment.get('contrast_multiplier', 1.0) or 1.0)))
            vf = f'setpts=PTS/{speed:.6f},eq=brightness={brightness:.6f}:contrast={contrast:.6f}:saturation={saturation:.6f},format=yuv420p'
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
