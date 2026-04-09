# HourlyGym FastAPI API — Python 3.12
FROM python:3.12-slim-bookworm

WORKDIR /app

# Some wheels need a compiler; keep layer cache-friendly
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads/trainers uploads/users

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# DATABASE_URL and secrets: use env_file or -e in docker compose (see ../.env.example notes)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
