# 24Rx - B2B Medicine Trading Platform

A comprehensive B2B platform for medicine trading, inventory management, and price tracking.

## 🚀 Features

### For Sellers
- List medicines from 251K+ reference database
- Upload credibility documents (invoices, receipts)
- Track inventory and sales
- Manage listings and pricing

### For Traders
- Browse and purchase medicines
- Hold inventory for speculation
- Track price trends and analytics
- Set price alerts

### For Admins
- Approve/reject user registrations
- Review and approve listings
- Manage medicine proposals
- View platform analytics

### Core Features
- **Authentication**: JWT-based auth with email verification
- **KYC**: Document upload and verification system
- **Real-time Pricing**: Track medicine prices over time
- **Watchlist**: Monitor medicines of interest
- **Price Alerts**: Get notified when prices hit targets
- **News**: Platform news and updates
- **Analytics**: Comprehensive trading analytics

## 🏗️ Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **ORM**: Prisma
- **Authentication**: JWT + Refresh Tokens
- **Email**: Gmail SMTP
- **Queue**: Bull (Redis-based)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: React Context
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Deployment**: Railway (recommended)
- **CI/CD**: GitHub Actions (optional)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- MinIO (or S3)
- Docker & Docker Compose (for containerized deployment)

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd 24Rx

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# MinIO Console: http://localhost:9001
```

See [DOCKER_README.md](./DOCKER_README.md) for detailed Docker instructions.

### Option 2: Manual Setup

#### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start development server
npm run start:dev
```

#### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

#### 3. Setup MinIO

```bash
# Windows
start-minio.bat

# Linux/Mac
./start-minio.sh
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medtrade

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRES_SECONDS=2592000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Admin
ADMIN_SECRET_KEY=your_admin_secret

# Email
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Frontend
FRONTEND_URL=http://localhost:3000

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

## 📚 Documentation

- [Docker Deployment Guide](./DOCKER_README.md)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [API Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)

## 🗄️ Database Schema

The platform uses PostgreSQL with the following main entities:

- **Users**: Sellers, Traders, Admins
- **Medicines**: Medicine catalog with manufacturer/marketer info
- **Listings**: Seller inventory listings
- **Orders**: Purchase transactions
- **Holds**: Trader inventory holds
- **Price History**: Historical pricing data
- **Watchlist**: User medicine watchlists
- **Price Alerts**: Price notification triggers

See `backend/prisma/schema.prisma` for complete schema.

## 🔐 Security

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Rate limiting with throttler
- Input validation with class-validator
- SQL injection prevention with Prisma
- XSS protection
- CORS configuration

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run test
npm run test:e2e
npm run test:cov
```

### Frontend Tests

```bash
cd frontend
npm run test
npm run test:watch
```

## 📦 Building for Production

### Backend

```bash
cd backend
npm run build
npm run start:prod
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

## 🚢 Deployment

### Railway (Recommended)

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for step-by-step Railway deployment guide.

### Docker

See [DOCKER_README.md](./DOCKER_README.md) for Docker deployment instructions.

### Other Platforms

The application can be deployed to:
- AWS (EC2, ECS, Elastic Beanstalk)
- Google Cloud Platform (Cloud Run, GKE)
- Azure (App Service, AKS)
- DigitalOcean (App Platform, Droplets)
- Heroku
- Vercel (Frontend only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Developer**: [Your Name]
- **Project**: 24Rx Medicine Trading Platform
- **Year**: 2024

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@24rx.com
- **Documentation**: See docs folder

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] AI-powered price predictions
- [ ] Multi-currency support
- [ ] International shipping
- [ ] Bulk order discounts
- [ ] Subscription plans
- [ ] API for third-party integrations

## 📊 Project Status

- ✅ Core features implemented
- ✅ Authentication & Authorization
- ✅ Listing management
- ✅ Order processing
- ✅ Price tracking
- ✅ Admin dashboard
- ✅ Docker support
- ✅ Railway deployment ready
- 🚧 Mobile app (planned)
- 🚧 Advanced analytics (planned)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Next.js team for the React framework
- Prisma team for the excellent ORM
- Railway for easy deployment
- All open-source contributors

---

Made with ❤️ by the 24Rx Team
