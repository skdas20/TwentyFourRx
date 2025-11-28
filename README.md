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
- **Storage**: Google Cloud Storage
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
- **File Storage**: Google Cloud Storage
- **Deployment**: Cloud-based (GCP, AWS, etc.)
- **CI/CD**: GitHub Actions (optional)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Google Cloud Storage account with service key

## 🚀 Quick Start

### 1. Setup Backend

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

### 2. Setup Frontend

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

#### 3. Setup Google Cloud Storage

Ensure you have the service account key file at:
```
backend/24rx-storage-service-key.json
```

The backend will automatically initialize the GCS bucket on startup.

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

# Google Cloud Storage
GCS_BUCKET_NAME=24rx-documents
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

## 📚 Documentation

- [GCS Migration Guide](./MIGRATION_TO_GCS.md)
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
npm install
npm run build
npx prisma migrate deploy
npm run start:prod
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

## 🚢 Deployment

The application can be deployed to any cloud platform:
- **Google Cloud Platform** (Recommended - already using GCS)
- **AWS** (EC2, Elastic Beanstalk)
- **Azure** (App Service)
- **DigitalOcean** (Droplets, App Platform)
- **Heroku**
- **Vercel** (Frontend only)

### Deployment Requirements:
1. PostgreSQL database
2. Redis instance
3. Google Cloud Storage bucket
4. Node.js 18+ runtime
5. Service account key file in backend directory

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
- ✅ Google Cloud Storage integration
- ✅ Cloud deployment ready
- 🚧 Mobile app (planned)
- 🚧 Advanced analytics (planned)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- Next.js team for the React framework
- Prisma team for the excellent ORM
- Google Cloud for reliable storage
- All open-source contributors

---

Made with ❤️ by the 24Rx Team
