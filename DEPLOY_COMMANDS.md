# Production Deployment - Quick Command Reference

## One-Line Deployment

```bash
./deploy_production.sh
```

## Step-by-Step Commands

### 1. Prerequisites Setup

```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project dicleshive

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Configure Docker
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### 2. Database Setup

```bash
# Set variables
export PROJECT_ID="dicleshive"
export REGION="europe-west1"
export CLOUD_SQL_INSTANCE="django-postgres"
export DB_NAME="django_db"
export DB_USER="django_user"
export DB_PASSWORD=$(openssl rand -base64 32)

# Create Cloud SQL instance
gcloud sql instances create ${CLOUD_SQL_INSTANCE} \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=${REGION} \
    --root-password=${DB_PASSWORD}

# Create database
gcloud sql databases create ${DB_NAME} \
    --instance=${CLOUD_SQL_INSTANCE}

# Create database user
gcloud sql users create ${DB_USER} \
    --instance=${CLOUD_SQL_INSTANCE} \
    --password=${DB_PASSWORD}
```

### 3. Artifact Registry Setup

```bash
# Create repository
gcloud artifacts repositories create the-hive \
    --repository-format=docker \
    --location=europe-west1
```

### 4. Build and Push Backend

```bash
# Build image
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest .

# Push image
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest
```

### 5. Deploy Backend

```bash
# Deploy to Cloud Run
gcloud run deploy django-app \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest \
    --platform=managed \
    --region=europe-west1 \
    --allow-unauthenticated \
    --add-cloudsql-instances=dicleshive:europe-west1:django-postgres \
    --set-env-vars="USE_POSTGRES=true,DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},DB_PORT=5432,POPULATE_MOCK_DATA=true" \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0 \
    --port=8000
```

### 6. Run Migrations (Automatic)

Migrations run automatically via `docker-entrypoint.sh`. To verify:

```bash
# Check logs
gcloud run services logs read django-app --region=europe-west1

# Or trigger update
gcloud run services update django-app \
    --region=europe-west1 \
    --update-env-vars="POPULATE_MOCK_DATA=true"
```

### 7. Populate Mock Data (Automatic)

Mock data populates automatically if `POPULATE_MOCK_DATA=true`. To trigger manually:

```bash
gcloud run services update django-app \
    --region=europe-west1 \
    --update-env-vars="POPULATE_MOCK_DATA=true"
```

### 8. Build and Push Frontend

```bash
# Build image
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    -f frontend/Dockerfile.prod frontend/

# Push image
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest
```

### 9. Deploy Frontend

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

## Verification Commands

```bash
# Get service URLs
gcloud run services describe django-app --region=europe-west1 --format="value(status.url)"
gcloud run services describe react-frontend --region=europe-west1 --format="value(status.url)"

# Check logs
gcloud run services logs read django-app --region=europe-west1
gcloud run services logs read react-frontend --region=europe-west1

# List all services
gcloud run services list --region=europe-west1

# Test backend
curl $(gcloud run services describe django-app --region=europe-west1 --format="value(status.url)")/api/offers/
```

## Update Commands

### Update Backend

```bash
# Rebuild and push
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest .
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest

# Deploy
gcloud run deploy django-app \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/django-app:latest \
    --region=europe-west1
```

### Update Frontend

```bash
# Rebuild and push
docker build -t europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    -f frontend/Dockerfile.prod frontend/
docker push europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest

# Deploy
gcloud run deploy react-frontend \
    --image=europe-west1-docker.pkg.dev/dicleshive/the-hive/react-frontend:latest \
    --region=europe-west1
```

## Database Commands

### Connect to Database

```bash
# Using gcloud
gcloud sql connect django-postgres --user=django_user --database=django_db

# Using Cloud SQL Proxy (recommended)
# Download: https://cloud.google.com/sql/docs/postgres/sql-proxy
./cloud-sql-proxy dicleshive:europe-west1:django-postgres
# Then in another terminal:
psql -h 127.0.0.1 -U django_user -d django_db
```

### Run Migrations Manually

```bash
# With Cloud SQL Proxy running
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
# With Cloud SQL Proxy running (same env vars as above)
python manage.py populate_mock_data --clear
```

## Cleanup Commands

```bash
# Delete services
gcloud run services delete django-app --region=europe-west1
gcloud run services delete react-frontend --region=europe-west1

# Delete Cloud SQL (WARNING: Deletes all data!)
gcloud sql instances delete django-postgres

# Delete Artifact Registry
gcloud artifacts repositories delete the-hive --location=europe-west1
```

## Troubleshooting Commands

```bash
# Check Cloud SQL status
gcloud sql instances describe django-postgres

# Check database
gcloud sql databases list --instance=django-postgres

# Check users
gcloud sql users list --instance=django-postgres

# Check service configuration
gcloud run services describe django-app --region=europe-west1

# Check revisions
gcloud run revisions list --service=django-app --region=europe-west1

# Rollback to previous revision
gcloud run services update-traffic django-app \
    --to-revisions=PREVIOUS_REVISION_NAME=100 \
    --region=europe-west1

# List Docker images
gcloud artifacts docker images list europe-west1-docker.pkg.dev/dicleshive/the-hive
```

## Environment Variables Reference

### Backend
- `USE_POSTGRES=true`
- `DB_NAME=django_db`
- `DB_USER=django_user`
- `DB_PASSWORD=...`
- `DB_PORT=5432`
- `POPULATE_MOCK_DATA=true` (set to false to skip)
- `DEBUG=false` (for production)

### Frontend
- `REACT_APP_API_URL=https://django-app-xxx.run.app`

## Quick Test

```bash
# Get URLs
BACKEND=$(gcloud run services describe django-app --region=europe-west1 --format="value(status.url)")
FRONTEND=$(gcloud run services describe react-frontend --region=europe-west1 --format="value(status.url)")

# Test
echo "Backend: $BACKEND"
echo "Frontend: $FRONTEND"
curl $BACKEND/api/offers/
```

