# EDIT-IA

Automatic video-edit reconstruction system. Upload a reference edit and a source video, analyze the observable editing language, reconstruct an adapted edit, render it, and run quality checks.

## Architecture
- Next.js UI/API for job submission and status.
- Specialized Python analysis stages for audio, video, effects, transitions, text, color, motion, and source matching.
- Master editor builds an adaptive timeline.
- FFmpeg render engine.
- QC + autocorrection loop.
- RunPod GPU worker for heavy processing.

The system reconstructs observable results; an MP4 cannot reveal hidden proprietary project/layer/plugin data.

## Local
See `docs/DEPLOYMENT.md`.

## RunPod
Build the repository root as a custom Docker image. Configure the worker endpoint and required storage/job secrets in the deployment environment.