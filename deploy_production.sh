#!/bin/bash

###############################################################################
# The Hive - Production Deployment Script
# 
# This script deploys the Django backend and React frontend to Google Cloud Run
# with PostgreSQL database, migrations, and mock data population.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Docker installed
# - Project configured in GCP
#
# Usage:
#   ./deploy_production.sh [--skip-db] [--skip-mock-data] [--skip-frontend]
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
PROJECT_ID="dicleshive"
REGION="europe-west1"
CLOUD_SQL_INSTANCE="django-postgres"
CLOUD_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
BACKEND_SERVICE_NAME="django-app"
FRONTEND_SERVICE_NAME="react-frontend"
ARTIFACT_REGISTRY_REPO="the-hive"
IMAGE_TAG="latest"

# Database configuration
DB_NAME="django_db"
DB_USER="django_user"
#DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"  # Generate if not set

# Parse command line arguments
SKIP_DB=false
SKIP_MOCK_DATA=false
SKIP_FRONTEND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --skip-mock-data)
            SKIP_MOCK_DATA=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with gcloud. Please run: gcloud auth login"
        exit 1
    fi
    
    # Set project
    log_info "Setting GCP project to ${PROJECT_ID}..."
    gcloud config set project ${PROJECT_ID}
    
    log_success "Prerequisites check passed"
}

# Setup Cloud SQL database
setup_database() {
    if [ "$SKIP_DB" = true ]; then
        log_warning "Skipping database setup"
        return
    fi
    
    log_info "Setting up Cloud SQL database..."
    
    # Check if Cloud SQL instance exists
    if gcloud sql instances describe ${CLOUD_SQL_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
        log_success "Cloud SQL instance '${CLOUD_SQL_INSTANCE}' already exists"
    else
        log_info "Creating Cloud SQL instance '${CLOUD_SQL_INSTANCE}'..."
        gcloud sql instances create ${CLOUD_SQL_INSTANCE} \
            --database-version=POSTGRES_16 \
            --tier=db-f1-micro \
            --region=${REGION} \
            --project=${PROJECT_ID} \
            --root-password=${DB_PASSWORD}
        
        log_success "Cloud SQL instance created"
    fi
    
    # Check if database exists
    if gcloud sql databases describe ${DB_NAME} --instance=${CLOUD_SQL_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
        log_success "Database '${DB_NAME}' already exists"
    else
        log_info "Creating database '${DB_NAME}'..."
        gcloud sql databases create ${DB_NAME} \
            --instance=${CLOUD_SQL_INSTANCE} \
            --project=${PROJECT_ID}
        
        log_success "Database created"
    fi
    
    # Check if user exists
    if gcloud sql users describe ${DB_USER} --instance=${CLOUD_SQL_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
        log_success "Database user '${DB_USER}' already exists"
        log_info "Updating password for user '${DB_USER}'..."
        gcloud sql users set-password ${DB_USER} \
            --instance=${CLOUD_SQL_INSTANCE} \
            --password=${DB_PASSWORD} \
            --project=${PROJECT_ID}
    else
        log_info "Creating database user '${DB_USER}'..."
        gcloud sql users create ${DB_USER} \
            --instance=${CLOUD_SQL_INSTANCE} \
            --password=${DB_PASSWORD} \
            --project=${PROJECT_ID}
        
        log_success "Database user created"
    fi
    
    log_success "Database setup complete"
    log_info "Database credentials:"
    log_info "  Host: ${CLOUD_SQL_CONNECTION_NAME}"
    log_info "  Database: ${DB_NAME}"
    log_info "  User: ${DB_USER}"
    log_info "  Password: ${DB_PASSWORD}"
}

# Setup Artifact Registry
setup_artifact_registry() {
    log_info "Setting up Artifact Registry..."
    
    # Check if repository exists
    if gcloud artifacts repositories describe ${ARTIFACT_REGISTRY_REPO} \
        --location=${REGION} \
        --project=${PROJECT_ID} &>/dev/null; then
        log_success "Artifact Registry repository '${ARTIFACT_REGISTRY_REPO}' already exists"
    else
        log_info "Creating Artifact Registry repository..."
        gcloud artifacts repositories create ${ARTIFACT_REGISTRY_REPO} \
            --repository-format=docker \
            --location=${REGION} \
            --project=${PROJECT_ID}
        
        log_success "Artifact Registry repository created"
    fi
    
    # Configure Docker authentication
    log_info "Configuring Docker authentication..."
    gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
    
    log_success "Artifact Registry setup complete"
}

# Build and push backend Docker image
build_and_push_backend() {
    log_info "Building backend Docker image..."
    
    IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${BACKEND_SERVICE_NAME}:${IMAGE_TAG}"
    
    # Build the image for linux/amd64 (Cloud Run requirement)
    docker build --platform linux/amd64 -t ${IMAGE_NAME} -f Dockerfile .
    
    log_success "Backend image built"
    
    # Push the image
    log_info "Pushing backend image to Artifact Registry..."
    docker push ${IMAGE_NAME}
    
    log_success "Backend image pushed"
    
    echo ${IMAGE_NAME}
}

# Deploy backend to Cloud Run
deploy_backend() {
    log_info "Deploying backend to Cloud Run..."
    
    IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${BACKEND_SERVICE_NAME}:${IMAGE_TAG}"
    
    # Get backend URL if service exists
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="value(status.url)" 2>/dev/null || echo "")
    
    # Determine POPULATE_MOCK_DATA value (invert SKIP_MOCK_DATA)
    if [ "$SKIP_MOCK_DATA" = true ]; then
        POPULATE_VALUE="false"
    else
        POPULATE_VALUE="true"
    fi
    
    # Deploy to Cloud Run
    gcloud run deploy ${BACKEND_SERVICE_NAME} \
        --image=${IMAGE_NAME} \
        --platform=managed \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --allow-unauthenticated \
        --add-cloudsql-instances=${CLOUD_SQL_CONNECTION_NAME} \
        --set-env-vars="USE_POSTGRES=true,DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},DB_PORT=5432,POPULATE_MOCK_DATA=${POPULATE_VALUE}" \
        --memory=512Mi \
        --cpu=1 \
        --timeout=300 \
        --max-instances=10 \
        --min-instances=0 \
        --port=8000
    
    # Get the new URL
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="value(status.url)")
    
    log_success "Backend deployed successfully"
    log_info "Backend URL: ${BACKEND_URL}"
    
    echo ${BACKEND_URL}
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create a temporary Cloud Run job or use Cloud SQL Proxy
    # For simplicity, we'll use a one-off Cloud Run job
    IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${BACKEND_SERVICE_NAME}:${IMAGE_TAG}"
    
    log_info "Executing migrations via Cloud Run job..."
    
    # Use gcloud run jobs for one-off tasks (if available) or exec into service
    # Alternative: Use Cloud Build or Cloud SQL Proxy
    
    # For now, we'll create a migration script that runs on the next deployment
    # The docker-entrypoint.sh already handles migrations, so they'll run on next deploy
    log_warning "Migrations will run automatically on next service start via docker-entrypoint.sh"
    log_info "To run migrations manually, you can:"
    log_info "  1. Use Cloud SQL Proxy to connect locally"
    log_info "  2. Or migrations will run automatically on service restart"
    
    log_success "Migrations will be executed on service start via docker-entrypoint.sh"
}

# Populate mock data
populate_mock_data() {
    if [ "$SKIP_MOCK_DATA" = true ]; then
        log_warning "Skipping mock data population"
        return
    fi
    
    log_info "Mock data will be populated automatically on service start"
    log_info "The docker-entrypoint.sh script handles this when POPULATE_MOCK_DATA=true"
    log_info "You can verify by checking the service logs:"
    log_info "  gcloud run services logs read ${BACKEND_SERVICE_NAME} --region=${REGION}"
}

# Build and push frontend Docker image
build_and_push_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        log_warning "Skipping frontend deployment"
        return ""
    fi
    
    log_info "Building frontend Docker image..."
    
    IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${FRONTEND_SERVICE_NAME}:${IMAGE_TAG}"
    
    # Build the image for linux/amd64 (Cloud Run requirement)
    docker build --platform linux/amd64 -t ${IMAGE_NAME} -f frontend/Dockerfile.prod frontend/
    
    log_success "Frontend image built"
    
    # Push the image
    log_info "Pushing frontend image to Artifact Registry..."
    docker push ${IMAGE_NAME}
    
    log_success "Frontend image pushed"
    
    echo ${IMAGE_NAME}
}

# Deploy frontend to Cloud Run
deploy_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        log_warning "Skipping frontend deployment"
        return
    fi
    
    log_info "Deploying frontend to Cloud Run..."
    
    IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${FRONTEND_SERVICE_NAME}:${IMAGE_TAG}"
    BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="value(status.url)")
    
    # Deploy to Cloud Run
    gcloud run deploy ${FRONTEND_SERVICE_NAME} \
        --image=${IMAGE_NAME} \
        --platform=managed \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --allow-unauthenticated \
        --memory=256Mi \
        --cpu=1 \
        --timeout=300 \
        --max-instances=10 \
        --min-instances=0 \
        --port=80 \
        --set-env-vars="REACT_APP_API_URL=${BACKEND_URL}"
    
    # Get the frontend URL
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="value(status.url)")
    
    log_success "Frontend deployed successfully"
    log_info "Frontend URL: ${FRONTEND_URL}"
}

# Update CORS settings (if needed)
update_cors_settings() {
    log_info "CORS settings are configured in Django settings.py"
    log_info "Make sure your settings.py includes the frontend URL in CORS_ALLOWED_ORIGINS"
    log_warning "You may need to update appsite/settings.py with the new frontend URL"
}

# Main deployment flow
main() {
    echo ""
    echo "=========================================="
    echo "🚀 The Hive - Production Deployment"
    echo "=========================================="
    echo ""
    
    log_info "Starting production deployment..."
    log_info "Project: ${PROJECT_ID}"
    log_info "Region: ${REGION}"
    log_info "Cloud SQL Instance: ${CLOUD_SQL_INSTANCE}"
    echo ""
    
    # Step 1: Check prerequisites
    check_prerequisites
    echo ""
    
    # Step 2: Setup database
    setup_database
    echo ""
    
    # Step 3: Setup Artifact Registry
    setup_artifact_registry
    echo ""
    
    # Step 4: Build and push backend
    BACKEND_IMAGE=$(build_and_push_backend)
    echo ""
    
    # Step 5: Deploy backend
    BACKEND_URL=$(deploy_backend)
    echo ""
    
    # Step 6: Run migrations
    run_migrations
    echo ""
    
    # Step 7: Populate mock data
    populate_mock_data
    echo ""
    
    # Step 8: Build and push frontend
    if [ "$SKIP_FRONTEND" = false ]; then
        FRONTEND_IMAGE=$(build_and_push_frontend)
        echo ""
        
        # Step 9: Deploy frontend
        deploy_frontend
        echo ""
    fi
    
    # Step 10: Final instructions
    echo "=========================================="
    log_success "Deployment complete!"
    echo "=========================================="
    echo ""
    log_info "Backend URL: ${BACKEND_URL}"
    if [ "$SKIP_FRONTEND" = false ]; then
        FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} \
            --region=${REGION} \
            --project=${PROJECT_ID} \
            --format="value(status.url)")
        log_info "Frontend URL: ${FRONTEND_URL}"
    fi
    echo ""
    log_info "Next steps:"
    log_info "1. Update appsite/settings.py with the new frontend URL in CORS_ALLOWED_ORIGINS"
    log_info "2. Verify the deployment by visiting the frontend URL"
    log_info "3. Check service logs: gcloud run services logs read ${BACKEND_SERVICE_NAME} --region=${REGION}"
    log_info "4. Test the API endpoints"
    echo ""
    log_info "Database credentials saved. Keep them secure!"
    log_info "  DB_PASSWORD=${DB_PASSWORD}"
    echo ""
}

# Run main function
main

