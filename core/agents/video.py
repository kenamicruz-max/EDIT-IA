import cv2
import numpy as np


def _sample_indices(frame_count: int, count: int):
    if frame_count <= 0:
        return []
    return np.unique(np.linspace(0, frame_count - 1, min(count, frame_count)).astype(int)).tolist()


def analyze(path: str) -> dict:
    cap = cv2.VideoCapture(path)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    duration = frame_count / fps if fps > 0 else 0.0
    samples = []
    cuts = []
    prev_gray = None
    indices = _sample_indices(frame_count, max(30, min(720, int(duration * 4) or 1)))
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
        ok, frame = cap.read()
        if not ok:
            continue
        small = cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        brightness = float(np.mean(gray))
        saturation = float(np.mean(hsv[:, :, 1]))
        contrast = float(np.std(gray))
        motion = float(np.mean(cv2.absdiff(gray, prev_gray))) if prev_gray is not None else 0.0
        t = idx / fps if fps else 0.0
        if prev_gray is not None and motion > max(18.0, contrast * 0.65):
            if not cuts or t - cuts[-1] >= 0.35:
                cuts.append(t)
        samples.append({'t': round(t, 4), 'brightness': brightness, 'saturation': saturation, 'contrast': contrast, 'motion': motion})
        prev_gray = gray
    cap.release()
    return {'duration': duration, 'fps': fps, 'width': width, 'height': height, 'cuts': cuts, 'samples': samples}
