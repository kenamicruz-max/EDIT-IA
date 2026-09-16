import os
import shutil
import subprocess
import tempfile


def _run(cmd):
    result = subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        tail = (result.stderr or '')[-5000:]
        raise RuntimeError(f'FFmpeg failed ({result.returncode}): {tail}')


def _has_audio(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', path],
        capture_output=True, text=True, check=False,
    )
    return bool(result.stdout.strip())


def _dimensions(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', path],
        capture_output=True, text=True, check=False,
    )
    raw = result.stdout.strip()
    try:
        w, h = [int(x) for x in raw.split('x', 1)]
        if w > 0 and h > 0:
            return w - (w % 2), h - (h % 2)
    except Exception:
        pass
    return 1280, 720


def _video_filter(segment, width, height):
    speed = max(0.5, min(2.0, float(segment.get('speed', 1.0) or 1.0)))
    brightness = float(segment.get('brightness_delta', 0.0)) / 255.0
    saturation = max(0.0, min(3.0, float(segment.get('saturation_multiplier', 1.0) or 1.0)))
    contrast = max(0.5, min(2.0, float(segment.get('contrast_multiplier', 1.0) or 1.0)))
    zoom = max(1.0, min(1.22, float(segment.get('zoom', 1.0) or 1.0)))
    shake = max(0.0, min(1.0, float(segment.get('shake', 0.0) or 0.0)))
    flash = max(0.0, min(1.0, float(segment.get('flash', 0.0) or 0.0)))

    filters = [f'setpts=PTS/{speed:.6f}', f'scale={width}:{height}:force_original_aspect_ratio=increase', f'crop={width}:{height}']
    if zoom > 1.002:
        zw = int(width * zoom) // 2 * 2
        zh = int(height * zoom) // 2 * 2
        amp = max(1.0, 8.0 * shake)
        x = f'(iw-ow)/2+sin(t*38)*{amp:.2f}' if shake > 0.02 else '(iw-ow)/2'
        y = f'(ih-oh)/2+cos(t*31)*{amp:.2f}' if shake > 0.02 else '(ih-oh)/2'
        filters.extend([f'scale={zw}:{zh}', f'crop={width}:{height}:{x}:{y}'])
    elif shake > 0.02:
        padw = int(width * 1.04) // 2 * 2
        padh = int(height * 1.04) // 2 * 2
        amp = 4.0 + 6.0 * shake
        filters.extend([
            f'scale={padw}:{padh}',
            f'crop={width}:{height}:(iw-ow)/2+sin(t*38)*{amp:.2f}:(ih-oh)/2+cos(t*31)*{amp:.2f}',
        ])

    filters.append(f'eq=brightness={brightness:.6f}:contrast={contrast:.6f}:saturation={saturation:.6f}')
    if flash > 0.02:
        flash_brightness = min(0.65, 0.30 + 0.35 * flash)
        filters.append(f"eq=brightness={flash_brightness:.6f}:saturation=1.08:enable='lt(t,0.08)'")
    filters.extend(['setsar=1', 'format=yuv420p'])
    return ','.join(filters)


def render(spec, source_path, output_path, reference_path=None):
    work = tempfile.mkdtemp(prefix='editia-render-')
    clips = []
    reference_path = reference_path if reference_path and os.path.exists(reference_path) else None
    audio_path = reference_path if reference_path and _has_audio(reference_path) else source_path if _has_audio(source_path) else None
    width, height = _dimensions(reference_path or source_path)
    try:
        segments = spec.get('segments', [])
        if not segments:
            raise RuntimeError('No renderable segments were produced')

        for i, segment in enumerate(segments):
            clip = os.path.join(work, f'{i:04d}.mp4')
            start = max(0.0, float(segment.get('source_start', 0.0)))
            target = max(0.05, float(segment.get('duration', 0.05)))
            speed = max(0.5, min(2.0, float(segment.get('speed', 1.0) or 1.0)))
            available = max(0.05, float(segment.get('source_end', start + target)) - start)
            source_len = max(0.05, min(available, target * speed))
            vf = _video_filter(segment, width, height)
            _run([
                'ffmpeg', '-y', '-ss', f'{start:.6f}', '-i', source_path,
                '-t', f'{source_len:.6f}', '-vf', vf, '-r', '30', '-an',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
                '-t', f'{target:.6f}', clip,
            ])
            clips.append(clip)

        concat = os.path.join(work, 'concat.txt')
        with open(concat, 'w', encoding='utf-8') as fh:
            for clip in clips:
                fh.write("file '" + clip.replace("'", "'\\''") + "'\n")

        silent_output = os.path.join(work, 'video.mp4')
        _run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-movflags', '+faststart', silent_output])

        if audio_path:
            duration = max(0.05, float(spec.get('duration', 0.0) or sum(float(s.get('duration', 0.0)) for s in segments)))
            _run([
                'ffmpeg', '-y', '-i', silent_output, '-i', audio_path,
                '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                '-af', 'apad', '-t', f'{duration:.6f}', '-movflags', '+faststart', output_path,
            ])
        else:
            shutil.copyfile(silent_output, output_path)

        return output_path
    finally:
        shutil.rmtree(work, ignore_errors=True)
