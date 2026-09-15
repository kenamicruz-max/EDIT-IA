FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PYTHONPATH=/app
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir -r /app/requirements.txt && pip3 install --no-cache-dir runpod
COPY ../core /app/core
COPY runpod_handler.py /app/runpod_handler.py
CMD ["python3","/app/runpod_handler.py"]