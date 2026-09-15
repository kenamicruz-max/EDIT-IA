FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONPATH=/app
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg libgl1 libglib2.0-0 unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY edit-ai-source.zip /tmp/edit-ai-source.zip
RUN unzip -q /tmp/edit-ai-source.zip -d /app && rm /tmp/edit-ai-source.zip
RUN pip3 install --no-cache-dir -r /app/worker/requirements.txt && pip3 install --no-cache-dir runpod
CMD ["python3","/app/worker/runpod_handler.py"]
