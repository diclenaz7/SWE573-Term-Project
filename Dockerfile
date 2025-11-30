FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# copy project
COPY . .

# Cloud Run will set PORT
ENV PORT=8000

# Django DB will come from env vars, see below
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT appsite.wsgi:application"]
