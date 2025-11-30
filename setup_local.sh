#!/bin/bash

# The Hive - Local Development Setup Script
# This script helps set up the Django backend for local development

set -e  # Exit on error

echo "🚀 Setting up The Hive backend for local development..."

# Check Python version
echo "📋 Checking Python version..."
python3 --version || { echo "❌ Python 3 is required. Please install Python 3.12+"; exit 1; }

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if database file exists
if [ ! -f "db.sqlite3" ]; then
    echo "🗄️  Setting up database..."
    python manage.py migrate
    echo "✅ Database migrations applied"
else
    echo "✅ Database file already exists"
    echo "💡 Run 'python manage.py migrate' if you need to apply new migrations"
fi

# Check if superuser exists
echo ""
echo "👤 Superuser setup..."
echo "💡 To create a superuser, run: python manage.py createsuperuser"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Activate virtual environment: source venv/bin/activate"
echo "   2. Start development server: python manage.py runserver"
echo "   3. Access admin at: http://localhost:8000/admin"
echo ""
echo "💡 For PostgreSQL setup, see LOCAL_DEVELOPMENT.md"

