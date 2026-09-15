def suggest(qc):
    patches={}
    if abs(qc.get('brightness_delta',0))>8: patches['brightness_delta']=-qc['brightness_delta']
    return patches
