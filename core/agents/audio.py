import subprocess
from pathlib import Path
import numpy as np


def _pcm(path: str, rate: int = 8000) -> np.ndarray:
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(rate), '-f', 's16le', 'pipe:1']
    try:
        raw = subprocess.check_output(cmd, stderr=subprocess.DEVNULL)
    except Exception:
        return np.empty(0, dtype=np.float32)
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0 if raw else np.empty(0, dtype=np.float32)


def _duration(path: Path) -> float:
    try:
        out = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(path)], text=True, stderr=subprocess.DEVNULL)
        return max(0.0, float(out.strip()))
    except Exception:
        return 0.0


def _pick_peaks(values, threshold, min_gap):
    if len(values) < 3:
        return []
    local = np.where((values[1:-1] >= values[:-2]) & (values[1:-1] >= values[2:]) & (values[1:-1] >= threshold))[0] + 1
    ranked = sorted((int(i) for i in local), key=lambda i: float(values[i]), reverse=True)
    chosen = []
    for i in ranked:
        if all(abs(i - j) >= min_gap for j in chosen):
            chosen.append(i)
    return sorted(chosen)


def analyze(path: str) -> dict:
    p = Path(path)
    duration = _duration(p)
    pcm = _pcm(p)
    if pcm.size < 1600:
        return {'duration': duration, 'bpm': None, 'beats': [], 'onsets': [], 'silence': [], 'intensity': []}

    rate, hop, window = 8000, 400, 800
    rms = np.array([
        float(np.sqrt(np.mean(pcm[i:i + window] ** 2) + 1e-12))
        for i in range(0, max(0, len(pcm) - window), hop)
    ], dtype=np.float32)
    if rms.size == 0:
        return {'duration': duration, 'bpm': None, 'beats': [], 'onsets': [], 'silence': [], 'intensity': []}

    baseline = np.convolve(rms, np.ones(9, dtype=np.float32) / 9.0, mode='same')
    onset = np.maximum(0.0, rms - baseline)
    threshold = float(np.mean(onset) + 1.05 * np.std(onset))
    min_gap = max(1, int(0.18 * rate / hop))
    peaks = _pick_peaks(onset, threshold, min_gap)
    onsets = [round(i * hop / rate, 4) for i in peaks[:1200]]

    # Estimate tempo from onset intervals, then normalize to a practical editing range.
    intervals = np.diff(onsets)
    intervals = intervals[(intervals >= 0.25) & (intervals <= 2.0)]
    bpm = None
    if intervals.size:
        bpm = 60.0 / float(np.median(intervals))
        while bpm < 70:
            bpm *= 2
        while bpm > 180:
            bpm /= 2
        bpm = round(float(bpm), 2)

    intensity = [
        {'t': round(i * hop / rate, 4), 'value': round(float(v), 5)}
        for i, v in enumerate(rms[::max(1, len(rms) // 600)])
    ]

    silence, start = [], None
    cutoff = max(0.008, float(np.percentile(rms, 20)) * 0.8)
    for i, value in enumerate(rms):
        t, silent = i * hop / rate, value <= cutoff
        if silent and start is None:
            start = t
        elif not silent and start is not None:
            if t - start >= 0.25:
                silence.append({'start': round(start, 4), 'end': round(t, 4)})
            start = None
    if start is not None:
        t = len(rms) * hop / rate
        if t - start >= 0.25:
            silence.append({'start': round(start, 4), 'end': round(t, 4)})

    return {
        'duration': duration,
        'bpm': bpm,
        'beats': onsets,
        'onsets': onsets,
        'silence': silence[:200],
        'intensity': intensity,
    }
