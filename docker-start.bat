@echo off
REM 24Rx Docker Startup Script for Windows

echo 🚀 Starting 24Rx Platform...

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from example...
    (
        echo # PostgreSQL
        echo POSTGRES_PASSWORD=postgres123
        echo.
        echo # Redis
        echo REDIS_PASSWORD=
        echo.
        echo # MinIO
        echo MINIO_ACCESS_KEY=minioadmin
        echo MINIO_SECRET_KEY=minioadmin123
        echo.
        echo # Backend
        echo JWT_SECRET=24rx_super_secret_jwt_key_change_in_production
        echo ADMIN_SECRET_KEY=24rx_admin_secret_key_2024
        echo GMAIL_USER=your_email@gmail.com
        echo GMAIL_APP_PASSWORD=your_app_password
        echo FRONTEND_URL=http://localhost:3000
        echo.
        echo # Frontend
        echo NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
    ) > .env
    echo ✅ Created .env file. Please update with your credentials.
    pause
    exit /b 1
)

REM Build and start services
echo 📦 Building Docker images...
docker-compose build

echo 🔄 Starting services...
docker-compose up -d

echo ⏳ Waiting for services to be healthy...
timeout /t 10 /nobreak > nul

REM Check service health
echo 🏥 Checking service health...
docker-compose ps

echo.
echo ✅ 24Rx Platform is starting!
echo.
echo 📍 Service URLs:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:8080
echo    MinIO UI:  http://localhost:9001
echo    MinIO API: http://localhost:9000
echo.
echo 📊 View logs:
echo    docker-compose logs -f
echo.
echo 🛑 Stop services:
echo    docker-compose down
echo.
pause
