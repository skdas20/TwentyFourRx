#!/bin/bash

# 24Rx Docker Startup Script
echo "🚀 Starting 24Rx Platform..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cat > .env << EOF
# PostgreSQL
POSTGRES_PASSWORD=postgres123

# Redis
REDIS_PASSWORD=

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Backend
JWT_SECRET=24rx_super_secret_jwt_key_change_in_production
ADMIN_SECRET_KEY=24rx_admin_secret_key_2024
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
EOF
    echo "✅ Created .env file. Please update with your credentials."
    exit 1
fi

# Build and start services
echo "📦 Building Docker images..."
docker-compose build

echo "🔄 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ 24Rx Platform is starting!"
echo ""
echo "📍 Service URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8080"
echo "   MinIO UI:  http://localhost:9001"
echo "   MinIO API: http://localhost:9000"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
