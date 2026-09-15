import json
import os
import shutil
import tempfile
import traceback
from datetime import datetime, timezone

import boto3
from core.orchestrator.pipeline import run


def now():
    return datetime.now(timezone.utc).isoformat()


def client():
    return boto3.client(
        's3',
        endpoint_url=os.environ['STORAGE_ENDPOINT'],
        aws_access_key_id=os.environ['STORAGE_ACCESS_KEY'],
        aws_secret_access_key=os.environ['STORAGE_SECRET_KEY'],
        region_name=os.environ.get('STORAGE_REGION', 'auto'),
    )


S3 = client()
BUCKET = os.environ['STORAGE_BUCKET']


def read_job(key):
    body = S3.get_object(Bucket=BUCKET, Key=key)['Body'].read()
    return json.loads(body.decode('utf-8'))


def write_job(job):
    job['updatedAt'] = now()
    S3.put_object(
        Bucket=BUCKET,
        Key=f"jobs/{job['id']}.json",
        Body=json.dumps(job, ensure_ascii=False).encode('utf-8'),
        ContentType='application/json',
        CacheControl='no-store',
    )


def queued_jobs():
    items = []
    token = None
    while True:
        kwargs = {'Bucket': BUCKET, 'Prefix': 'jobs/'}
        if token:
            kwargs['ContinuationToken'] = token
        page = S3.list_objects_v2(**kwargs)
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.endswith('.json'):
                try:
                    job = read_job(key)
                    if job.get('status') == 'QUEUED':
                        items.append((job.get('createdAt', ''), key, job))
                except Exception as exc:
                    print(f'Ignoring invalid job {key}: {exc}')
        if not page.get('IsTruncated'):
            break
        token = page.get('NextContinuationToken')
    items.sort(key=lambda x: x[0])
    return items


def process(job):
    work = tempfile.mkdtemp(prefix=f"editia-{job['id']}-")
    reference = os.path.join(work, 'reference.mp4')
    source = os.path.join(work, 'source.mp4')
    output = os.path.join(work, 'output.mp4')
    try:
        job['status'] = 'RUNNING'
        write_job(job)
        print(f"Processing {job['id']}")

        S3.download_file(BUCKET, job['reference'], reference)
        S3.download_file(BUCKET, job['source'], source)

        result = run(reference, source, output)
        output_key = f"outputs/{job['id']}.mp4"
        S3.upload_file(output, BUCKET, output_key, ExtraArgs={'ContentType': 'video/mp4'})
        output_url = S3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET, 'Key': output_key},
            ExpiresIn=86400,
        )

        job.update({
            'status': 'COMPLETED',
            'output': output_url,
            'outputKey': output_key,
            'qc': result.get('qc'),
            'spec': result.get('spec'),
            'finishedAt': now(),
        })
        write_job(job)
        print(f"Completed {job['id']}")
    except Exception as exc:
        job.update({
            'status': 'FAILED',
            'error': str(exc),
            'traceback': traceback.format_exc()[-12000:],
            'finishedAt': now(),
        })
        try:
            write_job(job)
        except Exception:
            print(traceback.format_exc())
        print(f"Failed {job['id']}: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    jobs = queued_jobs()
    print(f'Found {len(jobs)} queued job(s)')
    for _, _, job in jobs:
        process(job)


if __name__ == '__main__':
    main()
