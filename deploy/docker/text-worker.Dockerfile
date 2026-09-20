FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer libreoffice-calc libreoffice-impress fonts-dejavu fonts-liberation libseccomp2 tesseract-ocr tesseract-ocr-tur tesseract-ocr-eng && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY src/Workers/python/common /app/common
COPY src/Workers/python/text_worker /app/worker
COPY src/Workers/python/ocr_worker /app/ocr
RUN pip install --no-cache-dir -r /app/worker/requirements.txt
ENV PYTHONPATH=/app/common:/app/worker:/app/ocr OCR_PROVIDER=tesseract OCR_LANGUAGES=tur+eng OCR_RENDER_DPI=300
CMD ["python","/app/worker/main.py"]
