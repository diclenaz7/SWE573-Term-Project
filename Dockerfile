FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy project
COPY . .

# Make entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Cloud Run will set PORT
ENV PORT=8000

# Set entrypoint (use the script from the app directory)
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Django DB will come from env vars, see below
# Default command (can be overridden in docker-compose)
# Use daphne for ASGI/WebSocket support
CMD ["sh", "-c", "daphne -b 0.0.0.0 -p $PORT appsite.asgi:application"]
