from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DEFAULT_STYLE_FIELDS = (
    'audio', 'video', 'effects', 'transitions', 'text', 'vision', 'color', 'motion'
)


def build_style_profile(name: str, source_path: str, analyses: dict[str, Any], version: str = '1.0') -> dict[str, Any]:
    """Convert one reference edit's specialist reports into reusable style knowledge."""
    profile = {
        'schema': 'editia.style.v1',
        'version': version,
        'name': name,
        'source': {'path': source_path},
        'analysis': {field: analyses.get(field) for field in DEFAULT_STYLE_FIELDS},
    }
    return profile


def save_style_profile(profile: dict[str, Any], path: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding='utf-8')


def load_style_profile(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding='utf-8'))


def validate_style_profile(profile: dict[str, Any]) -> list[str]:
    errors = []
    if profile.get('schema') != 'editia.style.v1':
        errors.append('Invalid or missing style schema.')
    if not profile.get('name'):
        errors.append('Style name is required.')
    analysis = profile.get('analysis')
    if not isinstance(analysis, dict):
        errors.append('Style analysis must be an object.')
    else:
        missing = [field for field in DEFAULT_STYLE_FIELDS if field not in analysis]
        if missing:
            errors.append('Missing analysis fields: ' + ', '.join(missing))
    return errors
