# Storage contract

Production media flow: browser -> S3/R2-compatible object storage -> worker download -> rendered MP4/report upload -> job API returns a signed download URL.

Never store large production MP4s on ephemeral Vercel/Next local disk.