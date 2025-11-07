# MedTrade B2B - Medicine Trading Platform

A comprehensive B2B platform for medicine trading with features for Sellers, Traders, and Administrators. Built with NestJS, PostgreSQL, Next.js, and TypeScript.

## Features

### Core Functionality
- **Role-Based Access Control (RBAC)**: Admin, Trader, Seller roles with specific permissions
- **KYC Verification**: Document upload and approval workflow
- **Medicine Catalog**: Manage medicines with manufacturers and marketers
- **Listings Management**: Sellers create listings, Admin approves with markup
- **Trading Actions**: Buy, Sell, and Hold inventory
- **Hold Auto-Delivery**: Automatically converts holds to orders after 10 days
- **Price Tracking**: Historical price trends with charts
- **Analytics Dashboards**: Top-4 cards for medicines, listings, and news
- **Notifications**: Multi-channel (Email, SMS, In-App) notifications
- **News Articles**: Admin-published content linked to medicines

### Technical Features
- JWT Authentication with role guards
- PostgreSQL with Prisma ORM
- Redis + BullMQ for background jobs
- Full-text search with trigram indexes
- RESTful API with Swagger documentation
- Responsive UI with Tailwind CSS
- TanStack Query for data fetching
- Docker containerization

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Queue**: Redis + BullMQ
- **Authentication**: JWT + Passport
- **Validation**: class-validator + Zod
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL in Docker
- **Cache/Queue**: Redis in Docker
- **Reverse Proxy**: Nginx (production)

## Project Structure

```
24Rx/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── kyc/            # KYC verification
│   │   ├── medicines/      # Medicine catalog
│   │   ├── listings/       # Listings management
│   │   ├── orders/         # Order processing
│   │   ├── holds/          # Hold + auto-delivery worker
│   │   ├── inventory/      # Inventory lots
│   │   ├── prices/         # Price history
│   │   ├── news/           # News articles
│   │   ├── notifications/  # Notification service
│   │   ├── analytics/      # Analytics & dashboards
│   │   ├── config/         # Configuration (Prisma, Redis)
│   │   └── common/         # Guards, decorators, utilities
│   ├── prisma/
│   │   └── schema.prisma   # Prisma schema
│   └── docker/             # Docker configuration
├── frontend/               # Next.js frontend
│   ├── app/               # App Router pages
│   │   ├── auth/          # Login/Register
│   │   ├── dashboard/     # Role-based dashboards
│   │   ├── medicines/     # Medicine listings & details
│   │   └── news/          # News articles
│   ├── components/        # Reusable components
│   │   ├── charts/        # Chart components
│   │   ├── cards/         # Dashboard cards
│   │   ├── tables/        # Data tables
│   │   └── forms/         # Form components
│   └── lib/              # API client, utilities
└── b2b_medicine_schema.sql  # Database schema

```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional but recommended)

### Option 1: Docker Setup (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd 24Rx
```

2. **Start services with Docker Compose**
```bash
cd backend/docker
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 8080

3. **Initialize the database**
```bash
# The schema will be automatically applied via docker-entrypoint-initdb.d
# Or manually run:
docker exec -i medtrade-postgres psql -U medtrade -d medtrade < ../../b2b_medicine_schema.sql
```

4. **Set up the frontend**
```bash
cd ../../frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend will be available at http://localhost:3000

### Option 2: Manual Setup

#### Backend Setup

1. **Install dependencies**
```bash
cd backend
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Set up PostgreSQL database**
```bash
# Create database
createdb medtrade

# Run schema
psql -d medtrade -f ../b2b_medicine_schema.sql
```

4. **Generate Prisma Client**
```bash
npx prisma generate
```

5. **Start Redis** (if not using Docker)
```bash
redis-server
```

6. **Run the backend**
```bash
npm run start:dev
```

Backend API will be available at http://localhost:8080
API Documentation at http://localhost:8080/api/docs

#### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Set up environment variables**
```bash
cp .env.local.example .env.local
# Edit .env.local if needed
```

3. **Run the frontend**
```bash
npm run dev
```

Frontend will be available at http://localhost:3000

## Default Roles

The system comes with three predefined roles:
- **ADMIN**: Approves users, listings, manages catalog
- **TRADER**: Can buy, sell, and hold medicines
- **SELLER**: Can only sell medicines

## Key Workflows

### 1. User Registration & Approval
1. User registers as TRADER or SELLER
2. Status is set to PENDING
3. Admin reviews and approves/rejects
4. Only APPROVED users can log in

### 2. Medicine Listing
1. Seller proposes new medicine or creates listing
2. Admin reviews and sets markup percentage
3. list_price = base_price * (1 + admin_markup_pct/100)
4. Listing becomes ACTIVE

### 3. Hold Auto-Delivery
1. Trader creates a Hold (pays upfront)
2. System schedules auto-delivery job (hold_start + 10 days)
3. BullMQ worker converts Hold to Delivered Order
4. Notification sent to trader

### 4. Price Tracking
1. System tracks daily min/max/avg prices
2. Price history stored for trend analysis
3. Chart displays price trends over time

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get profile

### Admin
- `GET /api/v1/admin/users` - List users (with filters)
- `PATCH /api/v1/admin/users/:id/approve` - Approve user
- `PATCH /api/v1/admin/users/:id/reject` - Reject user
- `GET /api/v1/admin/listings` - List pending listings
- `PATCH /api/v1/admin/listings/:id/approve` - Approve listing

### Trading
- `POST /api/v1/trader/orders` - Create order (Buy)
- `POST /api/v1/trader/holds` - Create hold
- `POST /api/v1/trader/listings-from-inventory` - Relist from inventory

### Dashboards
- `GET /api/v1/dashboard/top-held` - Top 4 held medicines
- `GET /api/v1/dashboard/top-bought` - Top 4 bought medicines
- `GET /api/v1/dashboard/top-news` - Top 4 in news
- `GET /api/v1/dashboard/recent-listings` - Top 4 recent listings

### Price History
- `GET /api/v1/prices/history?medicineId=&range=30d` - Get price trend

Full API documentation available at `/api/docs` when backend is running.

## Database Schema Highlights

### Key Tables
- **users**: User accounts with role and status
- **medicines**: Medicine catalog (3NF normalized)
- **listings**: Seller offers with computed list_price
- **orders**: Buy/Sell transactions
- **holds**: Paid reservations with auto-delivery
- **price_history**: Daily price aggregates
- **notifications**: Multi-channel notifications
- **analytics_rollups**: Pre-computed dashboard metrics

### Generated Columns
- `listings.list_price` = base_price * (1 + admin_markup_pct/100)
- `orders.amount` = qty * unit_price

### Key Indexes
- Trigram GIN indexes for medicine/manufacturer search
- Partial index on active listings with stock
- Time-series indexes on price_history
- Job queue index on holds(auto_delivery_at)

## Environment Variables

### Backend (.env)
```
PORT=8080
DATABASE_URL=postgresql://user:pass@localhost:5432/medtrade
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_key
HOLD_AUTO_DELIVERY_DAYS=10
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
```

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm start
```

### Database Migrations
```bash
cd backend
npx prisma migrate dev --name description
npx prisma generate
```

## Deployment

### Production Checklist
- [ ] Change all JWT_SECRET and NEXTAUTH_SECRET values
- [ ] Use strong database passwords
- [ ] Configure S3 for file uploads
- [ ] Set up Email/SMS providers
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure CORS for production domain
- [ ] Set up monitoring and logging
- [ ] Configure backup for PostgreSQL
- [ ] Use Redis persistence (AOF/RDB)
- [ ] Set up CI/CD pipeline

### Docker Production Build
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify firewall rules

### Redis Connection Issues
- Ensure Redis is running
- Check REDIS_HOST and REDIS_PORT
- Verify Redis is not password-protected (or provide password)

### Authentication Issues
- Verify JWT_SECRET matches between backend and requests
- Check token expiration settings
- Ensure user status is APPROVED

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Proprietary - GenAI CoE

## Support

For issues and questions, please contact the development team or create an issue in the repository.

---

Built with by GenAI CoE
