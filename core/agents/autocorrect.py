def suggest(qc):
    patch = {}
    b = float(qc.get('brightness_delta', 0))
    s = float(qc.get('saturation_delta', 0))
    c = float(qc.get('contrast_delta', 0))
    if abs(b) > 3: patch['brightness_delta'] = -b
    if abs(s) > 3: patch['saturation_multiplier'] = max(0.5, min(2.0, 1.0 - s / 128.0))
    if abs(c) > 3: patch['contrast_multiplier'] = max(0.5, min(2.0, 1.0 - c / 128.0))
    return patch
