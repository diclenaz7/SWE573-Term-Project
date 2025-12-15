# Local Development Backend Setup

This guide will help you set up The Hive Django backend for local development without Docker.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python** 3.12+ (check with `python3 --version`)
- **pip** (Python package manager)
- **PostgreSQL** 16+ (optional - you can use SQLite for easier setup)
- **Git**

### Installing PostgreSQL (Optional)

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd the-hive-django
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

You should see `(venv)` in your terminal prompt when activated.

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Database Setup

You have two options for the database:

#### Option A: SQLite (Easier - Recommended for Quick Start)

SQLite requires no setup and is perfect for local development.

1. **Update settings.py** to use SQLite (see below)
2. **Skip to step 5**

#### Option B: PostgreSQL (Production-like)

1. **Create PostgreSQL database:**

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE django_db;
CREATE USER django_user WITH PASSWORD 'django_pass';
ALTER ROLE django_user SET client_encoding TO 'utf8';
ALTER ROLE django_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE django_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE django_db TO django_user;
\q
```

2. **Set environment variables** (optional, or update settings.py):

```bash
# On macOS/Linux:
export DB_NAME=django_db
export DB_USER=django_user
export DB_PASSWORD=django_pass
export DB_PORT=5432

# On Windows (PowerShell):
$env:DB_NAME="django_db"
$env:DB_USER="django_user"
$env:DB_PASSWORD="django_pass"
$env:DB_PORT="5432"
```

### 5. Configure Settings

Update `appsite/settings.py` database configuration for local development:

**For SQLite (easiest):**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

**For PostgreSQL:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'django_db'),
        'USER': os.environ.get('DB_USER', 'django_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'django_pass'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
```

**Also update CORS settings for local development:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# For local development, disable secure cookies
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
```

### 6. Run Migrations

```bash
# Create migration files
python manage.py makemigrations

# Apply migrations to database
python manage.py migrate
```

### 7. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

Follow the prompts to create an admin user.

### 8. Start Development Server

```bash
python manage.py runserver
```

The server will start at `http://localhost:8000`

You should see:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

## Verification

### Test the API

1. **Hello endpoint:**
   ```bash
   curl http://localhost:8000/api/hello/
   ```
   Should return: `{"message": "Hello, World!"}`

2. **Admin interface:**
   - Open browser: `http://localhost:8000/admin`
   - Login with superuser credentials

3. **API endpoints:**
   - `http://localhost:8000/api/auth/login/`
   - `http://localhost:8000/api/auth/register/`
   - `http://localhost:8000/api/auth/user/`

## Common Commands

### Database Operations

```bash
# Create new migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Rollback last migration
python manage.py migrate <app_name> <previous_migration_number>
```

### Django Shell

```bash
# Open Django shell
python manage.py shell

# Example usage:
from django.contrib.auth.models import User
from core.models import Offer, Need, Tag
users = User.objects.all()
```

### Create Superuser

```bash
python manage.py createsuperuser
```

### Collect Static Files (if needed)

```bash
python manage.py collectstatic
```

### Run Tests

```bash
python manage.py test
```

## Troubleshooting

### Database Connection Errors

**PostgreSQL:**
- Ensure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check credentials in settings.py match your database
- Verify database exists: `psql -U django_user -d django_db`

**SQLite:**
- Ensure you have write permissions in the project directory
- Check if `db.sqlite3` file exists and is accessible

### Port Already in Use

If port 8000 is already in use:
```bash
python manage.py runserver 8001
```

### Migration Issues

```bash
# Reset migrations (WARNING: deletes all data)
python manage.py flush

# Or delete migration files and recreate
rm core/migrations/0*.py
python manage.py makemigrations
python manage.py migrate
```

### Import Errors

- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`
- Check Python path: `which python` (should point to venv)

### CORS Issues

- Ensure frontend is running on `http://localhost:3000`
- Check `CORS_ALLOWED_ORIGINS` in settings.py
- Verify `corsheaders` is in `INSTALLED_APPS`

## Development Workflow

### 1. Activate Virtual Environment
```bash
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows
```

### 2. Start Development Server
```bash
python manage.py runserver
```

### 3. Make Code Changes
- Edit files in `appsite/` or `core/`
- Server auto-reloads on file changes

### 4. Create/Apply Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Test Changes
- Use Django shell: `python manage.py shell`
- Test API endpoints with curl or Postman
- Access admin at `http://localhost:8000/admin`

## Environment Variables (Optional)

Create a `.env` file in the project root:

```env
# Database
DB_NAME=django_db
DB_USER=django_user
DB_PASSWORD=django_pass
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
```

Then install `python-decouple` or `django-environ` to load these variables.

## IDE Setup

### VS Code

1. Select Python interpreter:
   - `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Python: Select Interpreter"
   - Choose the venv Python: `./venv/bin/python`

2. Install Python extension if not already installed

### PyCharm

1. Open project
2. Go to Settings → Project → Python Interpreter
3. Add interpreter → Existing environment
4. Select: `./venv/bin/python`

## Next Steps

- [ ] Set up frontend development (see `frontend/README.md`)
- [ ] Create API endpoints for core models
- [ ] Set up testing framework
- [ ] Configure logging
- [ ] Set up pre-commit hooks

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/) (if adding REST API)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Getting Help

If you encounter issues:
1. Check error messages carefully
2. Review Django logs in terminal
3. Check database connection
4. Verify all dependencies are installed
5. Ensure virtual environment is activated

