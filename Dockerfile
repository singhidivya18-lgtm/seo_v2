FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SEO_SKIP_PORT_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/seo_v2/

# State lives on a mounted volume when SEO_DATA_DIR is set (Railway/Fly).
# Default to a writable dir inside the container when unset.
ENV SEO_DATA_DIR=/data
RUN mkdir -p /data && chmod 777 /data

EXPOSE 8001

CMD ["sh", "-c", "uvicorn seo_v2.ui_server:app --host 0.0.0.0 --port ${PORT:-8001}"]