#!/bin/bash
set -e

# Find the directory containing manage.py
# Try common locations (docker-compose uses /code, Dockerfile uses /app)
if [ -f /code/manage.py ]; then
    cd /code
elif [ -f /app/manage.py ]; then
    cd /app
else
    # Try to find manage.py from current location
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." 2>/dev/null && pwd)"
    if [ -f "$PROJECT_ROOT/manage.py" ]; then
        cd "$PROJECT_ROOT"
    else
        echo "ERROR: Could not find manage.py"
        exit 1
    fi
fi

echo "=== Django Container Startup ==="
echo "Working directory: $(pwd)"

# Function to check database connectivity
check_db() {
  python manage.py shell -c "from django.db import connection; connection.ensure_connection()" 2>/dev/null
}

# Wait for database to be ready (only for PostgreSQL)
if [ "$USE_POSTGRES" = "true" ] || [ -n "$DB_HOST" ]; then
  echo "Waiting for PostgreSQL database to be ready..."
  max_attempts=30
  attempt=0
  
  while ! check_db; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo "ERROR: Database connection failed after $max_attempts attempts"
      exit 1
    fi
    echo "Database is unavailable - sleeping (attempt $attempt/$max_attempts)"
    sleep 2
  done
  
  echo "✓ Database is ready!"
else
  echo "Using SQLite database (no connection check needed)"
fi

echo "Running migrations..."
python manage.py migrate --noinput
echo "✓ Migrations completed"

# Ensure database cache table exists (required for session/token cache)
echo "Ensuring cache table exists..."
python manage.py createcachetable cache_table || true
echo "✓ Cache table ready"

# Populate mock data if POPULATE_MOCK_DATA is set to true
if [ "$POPULATE_MOCK_DATA" = "true" ]; then
  echo "Populating database with mock data..."
  python manage.py populate_mock_data --clear
  echo "✓ Mock data populated successfully!"
else
  echo "Skipping mock data population (set POPULATE_MOCK_DATA=true to enable)"
fi

echo "=== Starting application ==="

# Execute the main command
exec "$@"

