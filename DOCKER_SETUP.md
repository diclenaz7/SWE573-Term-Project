# Docker Setup with Automatic Database Population

This document explains how the Docker setup automatically populates the database with mock data.

## Overview

The Docker setup includes an entrypoint script (`docker-entrypoint.sh`) that automatically:
1. Waits for the database to be ready
2. Runs migrations
3. Optionally populates mock data

## How It Works

### Entrypoint Script

The `docker-entrypoint.sh` script runs before the main application command and:
- Checks database connectivity (for PostgreSQL)
- Runs `python manage.py migrate`
- Populates mock data if `POPULATE_MOCK_DATA=true`

### Configuration

In `docker-compose.yml`, the `POPULATE_MOCK_DATA` environment variable controls whether mock data is populated:

```yaml
environment:
  - POPULATE_MOCK_DATA=true  # Set to true to populate mock data on startup
```

### Usage

#### With Mock Data (Default in docker-compose.yml)

```bash
docker-compose up --build
```

This will automatically:
- Start PostgreSQL
- Wait for database
- Run migrations
- Populate 12 users, 20 tags, 8 offers, 6 needs, and sample interests/handshakes

#### Without Mock Data

Edit `docker-compose.yml` and set:
```yaml
- POPULATE_MOCK_DATA=false
```

Or override it when starting:
```bash
POPULATE_MOCK_DATA=false docker-compose up
```

## Manual Population

You can also manually populate data after the container is running:

```bash
# Populate data
docker-compose exec web python manage.py populate_mock_data

# Clear and repopulate
docker-compose exec web python manage.py populate_mock_data --clear
```

## Test Users

All mock users have the password: `testpass123`

You can log in with any of these usernames:
- `gardening_guru`
- `tech_helper`
- `cooking_mom`
- `pet_lover`
- `new_parent`
- `elderly_neighbor`
- `student_helper`
- `car_owner`
- `handyman_joe`
- `tutor_sarah`
- `chef_mike`
- `driver_alex`

## Production Considerations

**Important**: The `POPULATE_MOCK_DATA` feature is intended for development and testing only. 

For production:
1. Set `POPULATE_MOCK_DATA=false` or remove it from environment variables
2. The entrypoint script will skip data population
3. Use proper database seeding/migration strategies for production data

## Troubleshooting

### Database Connection Issues

If you see "Database is unavailable" errors:
1. Check that the `db` service is running: `docker-compose ps`
2. Check database logs: `docker-compose logs db`
3. Verify environment variables in `docker-compose.yml`

### Migration Issues

If migrations fail:
```bash
# Check migration status
docker-compose exec web python manage.py showmigrations

# Create new migrations if needed
docker-compose exec web python manage.py makemigrations

# Apply migrations manually
docker-compose exec web python manage.py migrate
```

### Mock Data Not Populating

1. Verify `POPULATE_MOCK_DATA=true` in `docker-compose.yml`
2. Check container logs: `docker-compose logs web`
3. Try manual population: `docker-compose exec web python manage.py populate_mock_data`

