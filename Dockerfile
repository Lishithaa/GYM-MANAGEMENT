# HourlyGym API only (monorepo root). For docker compose use backend/Dockerfile.
# DigitalOcean: use .do/app.yaml (api + web + ingress). Do not deploy this Dockerfile alone
# as the only component if you need the React UI on the same domain.
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN mkdir -p uploads/trainers uploads/users

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
