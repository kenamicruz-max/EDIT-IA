# RunPod deployment

Use the repository root Dockerfile as the custom worker image. Set the endpoint environment and storage credentials in the platform secret/environment configuration.

The worker accepts a job containing reference/source inputs and returns a rendered output path. For distributed production, wire those inputs/outputs through shared S3-compatible object storage as described in `docs/DEPLOYMENT.md`.