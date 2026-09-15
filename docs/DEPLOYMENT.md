# Deployment

EDIT-IA is split into a web layer and a heavy media worker. Vercel should host only the web/API layer; RunPod handles GPU media jobs.

For production, media files must live in shared object storage (S3/R2-compatible) rather than a Vercel/Next local filesystem. The browser should upload reference/source media to storage, the job API submits storage URLs/keys to the worker, and the worker stores the rendered result back in storage.

Required deployment values are documented in `.env.example`. Do not commit secrets.

## Worker image
The repository root `Dockerfile` is designed for a CUDA/FFmpeg RunPod worker. The handler is `worker/runpod_handler.py`.

## Important limitation
An MP4 provides observable pixels/audio only. It cannot reliably recover the original CapCut/After Effects hidden project structure, proprietary plugin state, or source-layer parameters. EDIT-IA reconstructs what can be inferred from the rendered media.