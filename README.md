# The Hive - Django & React Application

A full-stack web application built with Django REST API backend and React frontend, featuring user authentication and a modern development workflow with Docker containerization.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)

## Overview

The Hive is a community-driven web application that helps people connect, support each other, and exchange services in a spirit of reciprocity. By enabling users to offer help, request assistance, and collaborate, The Hive aims to create stronger, more resilient local networks.

**Problem**: Existing gig platforms optimize for monetization, not mutual aid; they create asymmetry between providers and consumers and de‑prioritize community.

**Vision**: A virtual commons where people exchange unordinary services and stories as equals using time as the currency. Offers and needs are discoverable on a map, described with semantic tags instead of resumes or ratings.
Primary outcomes

- Lower barriers to asking for help and contributing.
- Reciprocity by design (give and receive).
- Safety without surveillance: light‑touch moderation + community oversight.

## Tech Stack

### Backend

- **Framework**: Django 5.1.2
- **Language**: Python 3.12
- **Database**: PostgreSQL 16
- **Web Server**: Gunicorn (production)
- **CORS**: django-cors-headers 4.4.0
- **Database Driver**: psycopg2-binary 2.9.9

### Frontend

- **Framework**: React 19.2.0
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Routing**: React Router DOM 7.9.6
- **Testing**: React Testing Library
- **Node Version**: Node.js 18

### DevOps

- **Containerization**: Docker & Docker Compose
- **Development**: Hot reload enabled for both services
- **Production**: Optimized Dockerfiles for deployment

## Architecture

The application follows a client-server architecture:

```
┌─────────────────┐
│   React Client  │  (Port 3000)
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST API
         │
┌────────▼────────┐
│  Django Server  │  (Port 8000)
│   (Backend)     │
└────────┬────────┘
         │
┌────────▼────────┐
│   PostgreSQL    │  (Port 5432)
│    Database     │
└─────────────────┘
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git**

For local development without Docker:

- **Python** 3.12+
- **Node.js** 18+
- **PostgreSQL** 16+ (or use SQLite for development)

## Installation & Setup

### Using Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd the-hive-django
   ```

2. **Start the services**

   ```bash
   docker-compose up --build
   ```

   This will start:

   - PostgreSQL database on port `5432`
   - Django backend on port `8000`
   - React frontend on port `3000`

   **Note**: The Django container automatically:

   - Waits for the database to be ready
   - Runs migrations
   - Populates mock data (if `POPULATE_MOCK_DATA=true` in docker-compose.yml)

3. **Create a superuser** (optional, for admin access)

   ```bash
   docker-compose exec web python manage.py createsuperuser
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin

### Local Development (Without Docker)

#### Backend Setup

1. **Create a virtual environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables** (see [Environment Variables](#environment-variables))

4. **Run migrations**

   ```bash
   python manage.py migrate
   ```

5. **Start the development server**
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup

1. **Navigate to frontend directory**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## Development

### Docker Development Workflow

The `docker-compose.yml` includes watch mode for hot reloading:

- **Backend changes**: Automatically synced to container
- **Frontend changes**: Hot reloaded via React's development server
- **Requirements changes**: Container rebuilds automatically

### Running Commands

**Django management commands:**

```bash
docker-compose exec web python manage.py <command>
```

**Frontend commands:**

```bash
docker-compose exec frontend npm <command>
```

**View logs:**

```bash
docker-compose logs -f [service_name]  # e.g., web, frontend, db
```

### Database Management

**Create migrations:**

```bash
docker-compose exec web python manage.py makemigrations
```

**Apply migrations:**

```bash
docker-compose exec web python manage.py migrate
```

**Populate mock data:**

```bash
docker-compose exec web python manage.py populate_mock_data
# Or to clear and repopulate:
docker-compose exec web python manage.py populate_mock_data --clear
```

**Note**: Mock data is automatically populated on container startup if `POPULATE_MOCK_DATA=true` is set in `docker-compose.yml`.

**Access PostgreSQL shell:**

```bash
docker-compose exec db psql -U django_user -d django_db
```
