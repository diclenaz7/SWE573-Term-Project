# Deployment Files Overview

This directory contains all the files needed to deploy The Hive application to production on Google Cloud Run.

## Files Created

### 1. `deploy_production.sh` ⭐ (Main Script)
Automated deployment script that handles the entire deployment process:
- Database setup (Cloud SQL)
- Docker image building and pushing
- Cloud Run deployment
- Migrations and mock data population

**Usage:**
```bash
./deploy_production.sh                    # Full deployment
./deploy_production.sh --skip-db          # Skip database setup
./deploy_production.sh --skip-mock-data   # Skip mock data
./deploy_production.sh --skip-frontend   # Skip frontend
```

### 2. `PRODUCTION_DEPLOYMENT.md` 📖
Comprehensive deployment guide with:
- Prerequisites and setup instructions
- Detailed step-by-step manual deployment
- Troubleshooting guide
- Security best practices
- Cost optimization tips

### 3. `DEPLOY_COMMANDS.md` 📋
Quick reference for all deployment commands:
- Copy-paste ready commands
- Verification commands
- Update commands
- Database management commands
- Cleanup commands

## Quick Start

### Option 1: Automated (Recommended)
```bash
# Make script executable (if not already)
chmod +x deploy_production.sh

# Run deployment
./deploy_production.sh
```

### Option 2: Manual
Follow the step-by-step instructions in `PRODUCTION_DEPLOYMENT.md`

### Option 3: Quick Commands
Use commands from `DEPLOY_COMMANDS.md` for quick reference

## What Gets Deployed

1. **Backend (Django)**
   - Deployed to Cloud Run
   - Connected to Cloud SQL PostgreSQL
   - Automatic migrations on startup
   - Optional mock data population

2. **Frontend (React)**
   - Built and deployed to Cloud Run
   - Served via Nginx
   - Connected to backend API

3. **Database (PostgreSQL)**
   - Cloud SQL instance
   - Automatic migrations
   - Mock data population (optional)

## Configuration

Before running, update these variables in `deploy_production.sh`:

```bash
PROJECT_ID="dicleshive"              # Your GCP project ID
REGION="europe-west1"                # Your preferred region
CLOUD_SQL_INSTANCE="django-postgres" # Cloud SQL instance name
BACKEND_SERVICE_NAME="django-app"    # Backend service name
FRONTEND_SERVICE_NAME="react-frontend" # Frontend service name
```

## Prerequisites Checklist

- [ ] Google Cloud SDK (gcloud) installed
- [ ] Docker installed
- [ ] Authenticated with `gcloud auth login`
- [ ] Project set with `gcloud config set project dicleshive`
- [ ] Required APIs enabled (script handles this)

## Deployment Flow

```
1. Check Prerequisites
   ↓
2. Setup Cloud SQL Database
   ↓
3. Setup Artifact Registry
   ↓
4. Build & Push Backend Image
   ↓
5. Deploy Backend to Cloud Run
   ↓
6. Run Migrations (automatic)
   ↓
7. Populate Mock Data (if enabled)
   ↓
8. Build & Push Frontend Image
   ↓
9. Deploy Frontend to Cloud Run
   ↓
10. Done! ✅
```

## Post-Deployment

After deployment, you should:

1. **Update CORS settings** in `appsite/settings.py` with the frontend URL
2. **Verify deployment** by checking service URLs and logs
3. **Test endpoints** to ensure everything works
4. **Set up monitoring** (optional but recommended)

## Troubleshooting

If you encounter issues:

1. Check `PRODUCTION_DEPLOYMENT.md` → Troubleshooting section
2. Check service logs: `gcloud run services logs read django-app --region=europe-west1`
3. Verify database connection
4. Check CORS settings if frontend can't connect

## Security Notes

⚠️ **Important:**
- The script uses environment variables for database password
- For production, consider using Google Secret Manager
- Set `DEBUG=false` in production
- Use strong `SECRET_KEY` (generate with Django's `get_random_secret_key()`)

## Cost Considerations

- Cloud Run charges per request (scales to zero)
- Cloud SQL has a minimum cost (even when idle)
- Artifact Registry has storage costs
- Monitor usage in GCP Console

## Support

For detailed information, see:
- `PRODUCTION_DEPLOYMENT.md` - Full guide
- `DEPLOY_COMMANDS.md` - Command reference
- `DOCKER_SETUP.md` - Docker setup info
- `LOCAL_DEVELOPMENT.md` - Local development

## Next Steps

1. Run `./deploy_production.sh`
2. Wait for deployment to complete
3. Get service URLs from output
4. Update CORS settings
5. Test the application
6. Monitor logs and metrics

Happy deploying! 🚀

