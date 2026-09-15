from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
assert ROOT.joinpath('VERSION').read_text().strip().startswith('5.2')
assert (ROOT / 'Dockerfile').exists()
assert (ROOT / 'worker' / 'github_actions_worker.py').exists()
assert (ROOT / 'core' / 'orchestrator' / 'pipeline.py').exists()
print('EDIT-IA V5.2 sanity check: OK')
