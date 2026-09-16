#!/usr/bin/env python3
"""Pre-analyze a reference MP4 and save a reusable EDIT-IA style profile."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from core.agents import audio, video, effects, transitions, text, vision, color, motion
from core.library.style_catalog import build_style_profile, save_style_profile, validate_style_profile


SPECIALISTS = (
    ('effects', effects),
    ('transitions', transitions),
    ('text', text),
    ('vision', vision),
    ('color', color),
    ('motion', motion),
)


def analyze(path: str) -> dict:
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            'audio': pool.submit(audio.analyze, path),
            'video': pool.submit(video.analyze, path),
        }
        analyses = {name: future.result() for name, future in futures.items()}

        specialist_futures = {name: pool.submit(agent.analyze, analyses['video']) for name, agent in SPECIALISTS}
        for name, future in specialist_futures.items():
            analyses[name] = future.result()
    return analyses


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', help='Reference MP4')
    parser.add_argument('--name', required=True, help='Reusable style name')
    parser.add_argument('--output', required=True, help='Output JSON path')
    args = parser.parse_args()

    reference = Path(args.reference)
    if not reference.is_file():
        raise SystemExit(f'Reference file not found: {reference}')
    analyses = analyze(str(reference))
    profile = build_style_profile(args.name, str(reference), analyses)
    errors = validate_style_profile(profile)
    if errors:
        raise SystemExit('Invalid style profile: ' + ' | '.join(errors))
    save_style_profile(profile, args.output)
    print(f'Saved EDIT-IA style profile: {args.output}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
