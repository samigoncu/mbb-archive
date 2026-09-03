FROM python:3.12-slim
WORKDIR /app
COPY src/Workers/python/common /app/common
COPY src/Workers/python/ocr_worker /app/worker
RUN pip install --no-cache-dir -r /app/worker/requirements-paddle.txt
ENV PYTHONPATH=/app/common:/app/worker OCR_PROVIDER=paddle
CMD ["python","/app/worker/main.py"]
