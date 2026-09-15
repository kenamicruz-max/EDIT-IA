from pathlib import Path
import subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
assert (ROOT/'VERSION').read_text().strip().startswith('5.1')
assert (ROOT/'Dockerfile').exists()
assert (ROOT/'worker'/'runpod_handler.py').exists()
print('EDIT-IA V5.1 sanity check: OK')
