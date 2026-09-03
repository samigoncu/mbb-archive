FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY src/Workers/python/common /app/common
COPY src/Workers/python/ocr_worker /app/worker
RUN pip install --no-cache-dir -r /app/worker/requirements.txt
ENV PYTHONPATH=/app/common:/app/worker OCR_PROVIDER=tesseract
CMD ["python","/app/worker/main.py"]
