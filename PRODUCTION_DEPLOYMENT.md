# Production Deployment Guide

This guide covers deploying The Hive application to Google Cloud Run with PostgreSQL database, migrations, and mock data.

## Prerequisites

1. **Google Cloud SDK (gcloud CLI)**
   ```bash
   # Install gcloud CLI (if not installed)
   # macOS:
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Docker**
   ```bash
   # Install Docker Desktop or Docker Engine
   # Verify installation:
   docker --version
   ```

3. **Authentication**
   ```bash
   # Login to Google Cloud
   gcloud auth login
   
   # Set your project
   gcloud config set project dicleshive
   ```

4. **Enable Required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

## Quick Deployment

Use the automated deployment script:

```bash
./deploy_production.sh
```

### Script Options

```bash
# Skip database setup (if already configured)
./deploy_production.sh --skip-db

# Skip mock data population
./deploy_production.sh --skip-mock-data

# Skip frontend deployment
./deploy_production.sh --skip-frontend

# Combine options
./deploy_production.sh --skip-mock-data --skip-frontend
```

## Manual Deployment Steps

If you prefer to run commands manually, follow these steps:

### 1. Configuration

Update these variables in `deploy_production.sh` or set them as environment variables:

```bash
export PROJECT_ID="dicleshive"
export REGION="europe-west1"
export CLOUD_SQL_INSTANCE="django-postgres"
export BACKEND_SERVICE_NAME="django-app"
export FRONTEND_SERVICE_NAME="react-frontend"
export DB_NAME="django_db"
export DB_USER="django_user"
export DB_PASSWORD="your-secure-password"  # Generate with: openssl rand -base64 32
```

### 2. Setup Cloud SQL Database

```bash
# Create Cloud SQL instance (if it doesn't exist)
gcloud sql instances create django-postgres \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=europe-west1 \
    --root-password=${DB_PASSWORD}

# Create database
gcloud sql databases create django_db \
    --instance=django-postgres

# Create database user
gcloud sql users create django_user \
    --instance=django-postgres \
    --password=${DB_PASSWORD}
```

### 3. Setup Artifact Registry

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create the-hive \
    --repository-format=docker \
    --location=europe-west1

# Configure Docker authentication
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### 4. Build and Push Backend Image

```bash
# Build Docker image
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest .

# Push to Artifact Registry
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest
```

### 5. Deploy Backend to Cloud Run

```bash
# Deploy backend service
gcloud run deploy django-app \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest \
    --platform=managed \
    --region=europe-west1 \
    --allow-unauthenticated \
    --add-cloudsql-instances=dicleshive:europe-west1:django-postgres \
    --set-env-vars="USE_POSTGRES=true,DB_NAME=django_db,DB_USER=django_user,DB_PASSWORD=${DB_PASSWORD},DB_PORT=5432,POPULATE_MOCK_DATA=true" \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0 \
    --port=8000
```

### 6. Run Migrations

Migrations run automatically via `docker-entrypoint.sh` when the service starts. To verify:

```bash
# Check service logs
gcloud run services logs read django-app --region=europe-west1

# Or trigger a new revision
gcloud run services update django-app \
    --region=europe-west1 \
    --update-env-vars="RUN_MIGRATIONS=true"
```

### 7. Populate Mock Data

Mock data is populated automatically if `POPULATE_MOCK_DATA=true` is set. To populate manually:

```bash
# Update service to trigger data population
gcloud run services update django-app \
    --region=europe-west1 \
    --update-env-vars="POPULATE_MOCK_DATA=true"

# Or use Cloud SQL Proxy to run locally
gcloud sql connect django-postgres --user=django_user --database=django_db
# Then run: python manage.py populate_mock_data --clear
```

### 8. Build and Push Frontend Image

```bash
# Build frontend image
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    -f frontend/Dockerfile.prod frontend/

# Push to Artifact Registry
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest
```

### 9. Deploy Frontend to Cloud Run

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe django-app \
    --region=europe-west1 \
    --format="value(status.url)")

# Deploy frontend
gcloud run deploy react-frontend \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    --platform=managed \
    --region=europe-west1 \
    --allow-unauthenticated \
    --memory=256Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0 \
    --port=80 \
    --set-env-vars="REACT_APP_API_URL=${BACKEND_URL}"
```

### 10. Update CORS Settings

Update `appsite/settings.py` to include the frontend URL:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://django-app-494208442673.europe-west1.run.app",
    "https://react-frontend-494208442673.europe-west1.run.app",  # Add your frontend URL
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://django-app-494208442673.europe-west1.run.app",
    "https://react-frontend-494208442673.europe-west1.run.app",  # Add your frontend URL
]
```

Then redeploy:

```bash
# Rebuild and push backend
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest .
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest

# Update service
gcloud run deploy django-app \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest \
    --region=europe-west1
```

## Verification

### Check Service Status

```bash
# List all services
gcloud run services list --region=europe-west1

# Get service URLs
gcloud run services describe django-app --region=europe-west1 --format="value(status.url)"
gcloud run services describe react-frontend --region=europe-west1 --format="value(status.url)"
```

### Check Logs

```bash
# Backend logs
gcloud run services logs read django-app --region=europe-west1

# Frontend logs
gcloud run services logs read react-frontend --region=europe-west1

# Follow logs in real-time
gcloud run services logs tail django-app --region=europe-west1
```

### Test Endpoints

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe django-app --region=europe-west1 --format="value(status.url)")

# Test health endpoint (if available)
curl ${BACKEND_URL}/api/health

# Test API
curl ${BACKEND_URL}/api/offers/
```

## Database Management

### Connect to Database

```bash
# Using Cloud SQL Proxy (recommended for local access)
# Download Cloud SQL Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy

# Start proxy
./cloud-sql-proxy dicleshive:europe-west1:django-postgres

# In another terminal, connect with psql
psql -h 127.0.0.1 -U django_user -d django_db

# Or use gcloud
gcloud sql connect django-postgres --user=django_user --database=django_db
```

### Run Migrations Manually

```bash
# Using Cloud SQL Proxy
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME=django_db
export DB_USER=django_user
export DB_PASSWORD=your-password
export USE_POSTGRES=true

python manage.py migrate
```

### Populate Mock Data Manually

```bash
# Using Cloud SQL Proxy (same environment variables as above)
python manage.py populate_mock_data --clear
```

## Troubleshooting

### Database Connection Issues

```bash
# Check Cloud SQL instance status
gcloud sql instances describe django-postgres

# Check database
gcloud sql databases list --instance=django-postgres

# Check users
gcloud sql users list --instance=django-postgres
```

### Service Deployment Issues

```bash
# Check service configuration
gcloud run services describe django-app --region=europe-west1

# Check recent revisions
gcloud run revisions list --service=django-app --region=europe-west1

# Rollback to previous revision
gcloud run services update-traffic django-app \
    --to-revisions=REVISION_NAME=100 \
    --region=europe-west1
```

### Image Build Issues

```bash
# Test Docker build locally
docker build -t test-image .
docker run -p 8000:8000 test-image

# Check Artifact Registry
gcloud artifacts docker images list europe-west1-docker.pkg.dev/dicleshive/the-hive
```

### CORS Issues

1. Verify frontend URL is in `CORS_ALLOWED_ORIGINS` in `appsite/settings.py`
2. Check browser console for CORS errors
3. Verify `CORS_ALLOW_CREDENTIALS = True` is set
4. Check that cookies are being sent with requests

## Environment Variables

### Backend Environment Variables

- `USE_POSTGRES=true` - Use PostgreSQL database
- `DB_NAME=django_db` - Database name
- `DB_USER=django_user` - Database user
- `DB_PASSWORD=...` - Database password
- `DB_PORT=5432` - Database port
- `POPULATE_MOCK_DATA=true` - Populate mock data on startup
- `DEBUG=false` - Disable debug mode in production
- `SECRET_KEY=...` - Django secret key (use secrets manager in production)

### Frontend Environment Variables

- `REACT_APP_API_URL=...` - Backend API URL

## Security Best Practices

1. **Use Secret Manager for sensitive data:**
   ```bash
   # Create secret
   echo -n "your-db-password" | gcloud secrets create db-password --data-file=-
   
   # Use in Cloud Run
   gcloud run services update django-app \
       --update-secrets=DB_PASSWORD=db-password:latest \
       --region=europe-west1
   ```

2. **Set DEBUG=False in production:**
   ```bash
   gcloud run services update django-app \
       --update-env-vars="DEBUG=false" \
       --region=europe-west1
   ```

3. **Use strong SECRET_KEY:**
   ```bash
   # Generate secret key
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   
   # Store in Secret Manager
   echo -n "generated-secret-key" | gcloud secrets create django-secret-key --data-file=-
   ```

4. **Enable Cloud Armor for DDoS protection** (optional)

5. **Set up monitoring and alerting** (optional)

## Cost Optimization

1. **Use minimum instances:**
   - Set `--min-instances=0` to scale to zero when not in use

2. **Right-size resources:**
   - Start with `--memory=512Mi --cpu=1` and adjust based on usage

3. **Use Cloud SQL Proxy for local development** instead of always-on Cloud SQL instance

4. **Monitor usage:**
   ```bash
   gcloud billing accounts list
   gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID
   ```

## Updating the Deployment

### Update Backend

```bash
# 1. Make code changes
# 2. Rebuild and push image
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest .
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest

# 3. Deploy new revision
gcloud run deploy django-app \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest \
    --region=europe-west1
```

### Update Frontend

```bash
# 1. Make code changes
# 2. Rebuild and push image
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    -f frontend/Dockerfile.prod frontend/
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest

# 3. Deploy new revision
gcloud run deploy react-frontend \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    --region=europe-west1
```

## Cleanup

To remove all resources:

```bash
# Delete Cloud Run services
gcloud run services delete django-app --region=europe-west1
gcloud run services delete react-frontend --region=europe-west1

# Delete Cloud SQL instance (WARNING: This deletes all data!)
gcloud sql instances delete django-postgres

# Delete Artifact Registry repository
gcloud artifacts repositories delete the-hive --location=europe-west1
```

## Support

For issues or questions:
1. Check service logs: `gcloud run services logs read django-app --region=europe-west1`
2. Review Cloud SQL logs: `gcloud sql operations list --instance=django-postgres`
3. Check Cloud Run metrics in GCP Console

