# 24Rx Platform - Future Plans & Scaling Roadmap

**Document Purpose:** Comprehensive guide for scaling 24Rx from monolith to enterprise-grade microservices platform with AI capabilities.

**Current Status:** Monolithic Next.js + NestJS application on single GCP VM
**Target:** Kubernetes-orchestrated microservices with Kafka event streaming and AI-powered agents

---

## Table of Contents
1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Server Upgrade Requirements](#2-server-upgrade-requirements)
3. [Microservices Architecture](#3-microservices-architecture)
4. [Kubernetes Deployment](#4-kubernetes-deployment)
5. [Apache Kafka Integration](#5-apache-kafka-integration)
6. [Load Balancing & Nginx](#6-load-balancing--nginx)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [AI Agent Implementation](#8-ai-agent-implementation)
9. [Additional Scaling Tools](#9-additional-scaling-tools)
10. [Migration Plan](#10-migration-plan)
11. [Cost Analysis](#11-cost-analysis)
12. [Resume-Worthy Technologies](#12-resume-worthy-technologies)

---

## 1. Current Architecture Analysis

### Current Setup
```
┌─────────────────────────────────────┐
│   Single GCP VM (e2-small)          │
│   - 2 vCPU, 3.8GB RAM               │
│   - 9.7GB Disk (85% full)           │
│                                     │
│   ┌──────────────┐                  │
│   │  Frontend    │ (Next.js 16)    │
│   │  Port 3000   │                  │
│   └──────────────┘                  │
│          ↓                          │
│   ┌──────────────┐                  │
│   │  Backend     │ (NestJS)        │
│   │  Port 8080   │                  │
│   └──────────────┘                  │
│          ↓                          │
│   ┌──────────────┐                  │
│   │  PostgreSQL  │                  │
│   │  Port 5432   │                  │
│   └──────────────┘                  │
└─────────────────────────────────────┘
```

### Identified Bottlenecks

**1. Database Load Points:**
- `/listings/search` - Full table scans with ILIKE
- `/medicines?search=` - JOIN-heavy queries across 4 tables
- Bulk CSV processing - Locks entire listings table
- Real-time notifications - Polling database every 30s

**2. CPU-Intensive Operations:**
- Image watermarking (WatermarkService)
- CSV parsing for bulk uploads
- PDF generation for invoices
- Email rendering

**3. Memory Issues:**
- Next.js builds consume 1.2GB RAM
- Large CSV files (5000+ rows) held in memory
- No caching layer - all data from DB

**4. Network Bottlenecks:**
- Google Cloud Storage uploads blocking API responses
- Email sending (via SMTP) blocks order creation
- Single frontend server - no CDN

**5. Scalability Concerns:**
- Stateful sessions (can't horizontally scale)
- No request queuing for heavy operations
- Manual deployment process
- Single point of failure

---

## 2. Server Upgrade Requirements

### Option A: Upgrade Current VM (Recommended for Quick Win)

**Steps:**
1. Stop VM: `gcloud compute instances stop new24rx-server`
2. Change machine type:
   ```bash
   gcloud compute instances set-machine-type new24rx-server \
     --machine-type e2-standard-4 \
     --zone us-central1-a
   ```
3. Expand disk:
   ```bash
   gcloud compute disks resize new24rx-server \
     --size 100GB \
     --zone us-central1-a

   # Then resize filesystem
   sudo resize2fs /dev/sda1
   ```

**New Specs:**
- **Machine Type:** e2-standard-4
- **vCPUs:** 4
- **RAM:** 16GB
- **Disk:** 100GB SSD
- **Cost:** ~$120/month

### Option B: New Production Setup (Recommended for Long-term)

**Infrastructure Components:**

```yaml
# GKE Cluster Configuration
apiVersion: container.cnf.gcp.upbound.io/v1beta1
kind: Cluster
spec:
  name: 24rx-production
  location: us-central1
  initialNodeCount: 3
  nodeConfig:
    machineType: e2-standard-4
    diskSizeGb: 100
    oauthScopes:
      - https://www.googleapis.com/auth/cloud-platform
```

**Resources:**
- **GKE Cluster:** 3 nodes × e2-standard-4
- **Cloud SQL:** PostgreSQL 14, db-custom-4-16384 (4 vCPU, 16GB)
- **Cloud Memorystore:** Redis 6GB
- **Cloud Storage:** Standard bucket for images
- **Total Cost:** ~$450-500/month

---

## 3. Microservices Architecture

### Service Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Kong/Nginx)                 │
│                    Load Balancer (GCP LB)                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│Auth Service  │    │Listing Service│   │Order Service │
│- JWT         │    │- CRUD         │   │- Buy Proposals│
│- KYC         │    │- Search       │   │- Orders      │
│- Permissions │    │- Bulk Upload  │   │- Invoices    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
                   ┌──────────────┐
                   │ Kafka Broker │
                   └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│Notification  │    │Media Service │   │AI Agent      │
│Service       │    │- Images      │   │Service       │
│- Email       │    │- Watermark   │   │- Chatbot     │
│- In-app      │    │- Storage     │   │- Actions     │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 1. Auth Service (Port 8081)

**Responsibilities:**
- User authentication (JWT)
- KYC document management
- Role-based access control
- Session management

**Tech Stack:**
- NestJS
- Passport.js
- Redis for session storage

**Database:** Users, KYC documents, roles

**API Endpoints:**
```
POST   /auth/login
POST   /auth/register
POST   /auth/refresh
GET    /auth/me
POST   /kyc/upload
GET    /kyc/documents/:userId
```

### 2. Listing Service (Port 8082)

**Responsibilities:**
- Medicine listing CRUD
- Search & filtering
- Bulk CSV processing
- Price management

**Tech Stack:**
- NestJS
- Elasticsearch for search
- Bull queue for CSV processing

**Database:** Medicines, Listings, MedicineReferences, Manufacturers

**API Endpoints:**
```
GET    /listings
POST   /listings
GET    /listings/search
POST   /listings/bulk
GET    /medicines/:id
```

### 3. Order Service (Port 8083)

**Responsibilities:**
- Buy proposals
- Order management
- Invoice generation
- Payment tracking

**Tech Stack:**
- NestJS
- PDFKit for invoices
- Razorpay integration

**Database:** BuyProposals, Orders, Payments

**API Endpoints:**
```
POST   /proposals
GET    /proposals/:id
POST   /orders
GET    /orders/:id
POST   /orders/:id/invoice
```

### 4. Notification Service (Port 8084)

**Responsibilities:**
- Email notifications
- In-app notifications
- Push notifications (future)
- SMS (future)

**Tech Stack:**
- NestJS
- Bull queue for email jobs
- Nodemailer
- Firebase Cloud Messaging

**Database:** Notifications

**Kafka Topics Consumed:**
- `user.registered`
- `kyc.uploaded`
- `listing.created`
- `order.placed`

### 5. Media Service (Port 8085)

**Responsibilities:**
- Image uploads
- Image watermarking
- File compression
- CDN integration

**Tech Stack:**
- NestJS
- Sharp for image processing
- Google Cloud Storage
- CloudFlare CDN

**API Endpoints:**
```
POST   /media/upload
POST   /media/watermark
GET    /media/:id
DELETE /media/:id
```

### 6. AI Agent Service (Port 8086)

**Responsibilities:**
- Chatbot conversations
- Action execution (search, delete, update)
- Natural language to API calls
- Context-aware responses

**Tech Stack:**
- NestJS
- Claude API (Anthropic)
- LangChain for tool orchestration
- Redis for conversation context

**Features:**
- Search users by criteria
- Find medicines by composition
- Delete users (with confirmation)
- Generate reports
- Scroll through data (pagination)

---

## 4. Kubernetes Deployment

### GKE Cluster Setup

**1. Create Cluster:**
```bash
gcloud container clusters create 24rx-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --disk-size 100 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-cloud-logging \
  --enable-cloud-monitoring
```

**2. Configure kubectl:**
```bash
gcloud container clusters get-credentials 24rx-cluster \
  --zone us-central1-a
```

### Kubernetes Manifests

**Namespace:**
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: twentyfourx-prod
```

**ConfigMap:**
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: twentyfourx-prod
data:
  DATABASE_HOST: "10.x.x.x"  # Cloud SQL private IP
  REDIS_HOST: "10.x.x.x"      # Memorystore IP
  KAFKA_BROKERS: "kafka-0.kafka-svc:9092,kafka-1.kafka-svc:9092"
  GCS_BUCKET: "24rx-media"
```

**Secrets:**
```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: twentyfourx-prod
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded>
  JWT_SECRET: <base64-encoded>
  CLAUDE_API_KEY: <base64-encoded>
  SMTP_PASSWORD: <base64-encoded>
```

**Auth Service Deployment:**
```yaml
# auth-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: twentyfourx-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: gcr.io/YOUR_PROJECT/auth-service:latest
        ports:
        - containerPort: 8081
        env:
        - name: PORT
          value: "8081"
        - name: DATABASE_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_HOST
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DATABASE_PASSWORD
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: twentyfourx-prod
spec:
  selector:
    app: auth-service
  ports:
  - port: 8081
    targetPort: 8081
  type: ClusterIP
```

**Horizontal Pod Autoscaler:**
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: twentyfourx-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 5. Apache Kafka Integration

### Kafka Setup on Kubernetes

**1. Install Strimzi Operator:**
```bash
kubectl create namespace kafka
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka'
```

**2. Kafka Cluster:**
```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: 24rx-kafka
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
    storage:
      type: persistent-claim
      size: 100Gi
      class: standard
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: standard
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

### Kafka Topics

```yaml
# kafka-topics.yaml
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
  labels:
    strimzi.io/cluster: 24rx-kafka
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: 604800000  # 7 days
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: listing-events
  namespace: kafka
spec:
  partitions: 5
  replicas: 3
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: order-events
  namespace: kafka
spec:
  partitions: 5
  replicas: 3
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: notification-queue
  namespace: kafka
spec:
  partitions: 3
  replicas: 3
```

### Event Schema (Using Avro)

**User Event:**
```json
{
  "namespace": "com.twentyfourx.events",
  "type": "record",
  "name": "UserEvent",
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "eventType", "type": {
      "type": "enum",
      "name": "UserEventType",
      "symbols": ["REGISTERED", "KYC_UPLOADED", "APPROVED", "REJECTED"]
    }},
    {"name": "userId", "type": "string"},
    {"name": "timestamp", "type": "long"},
    {"name": "data", "type": {
      "type": "record",
      "name": "UserData",
      "fields": [
        {"name": "email", "type": "string"},
        {"name": "name", "type": "string"},
        {"name": "role", "type": "string"}
      ]
    }}
  ]
}
```

### Kafka Usage Examples

**Producer (Listing Service):**
```typescript
// src/kafka/kafka.producer.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'listing-service',
      brokers: process.env.KAFKA_BROKERS.split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async publishListingCreated(listing: any) {
    await this.producer.send({
      topic: 'listing-events',
      messages: [
        {
          key: listing.id,
          value: JSON.stringify({
            eventType: 'LISTING_CREATED',
            listingId: listing.id,
            sellerId: listing.sellerId,
            medicineId: listing.medicineId,
            price: listing.basePrice,
            stock: listing.stock,
            timestamp: Date.now(),
          }),
        },
      ],
    });
  }
}
```

**Consumer (Notification Service):**
```typescript
// src/kafka/kafka.consumer.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { EmailService } from '../email/email.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(private emailService: EmailService) {
    this.kafka = new Kafka({
      clientId: 'notification-service',
      brokers: process.env.KAFKA_BROKERS.split(','),
    });
    this.consumer = this.kafka.consumer({ groupId: 'notification-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: ['user-events', 'listing-events', 'order-events'],
      fromBeginning: false
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());

        switch (topic) {
          case 'user-events':
            await this.handleUserEvent(event);
            break;
          case 'listing-events':
            await this.handleListingEvent(event);
            break;
          case 'order-events':
            await this.handleOrderEvent(event);
            break;
        }
      },
    });
  }

  private async handleUserEvent(event: any) {
    if (event.eventType === 'REGISTERED') {
      await this.emailService.sendWelcomeEmail(event.data.email, event.data.name);
    }
  }
}
```

---

## 6. Load Balancing & Nginx

### GCP Load Balancer + Nginx Ingress

**1. Install Nginx Ingress Controller:**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

**2. Ingress Configuration:**
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: 24rx-ingress
  namespace: twentyfourx-prod
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - api.24rxexchange.com
    secretName: api-tls-cert
  rules:
  - host: api.24rxexchange.com
    http:
      paths:
      - path: /auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 8081
      - path: /listings
        pathType: Prefix
        backend:
          service:
            name: listing-service
            port:
              number: 8082
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 8083
      - path: /notifications
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 8084
      - path: /media
        pathType: Prefix
        backend:
          service:
            name: media-service
            port:
              number: 8085
      - path: /ai
        pathType: Prefix
        backend:
          service:
            name: ai-agent-service
            port:
              number: 8086
```

**3. Rate Limiting ConfigMap:**
```yaml
# nginx-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  limit-req-zone: "$binary_remote_addr zone=mylimit:10m rate=10r/s"
  limit-req: "zone=mylimit burst=20 nodelay"
```

---

## 7. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GKE

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GKE_CLUSTER: 24rx-cluster
  GKE_ZONE: us-central1-a
  IMAGE: twentyfourx

jobs:
  setup-build-publish-deploy:
    name: Setup, Build, Publish, and Deploy
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Setup Cloud SDK
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ secrets.GCP_PROJECT_ID }}

    - name: Configure Docker
      run: gcloud auth configure-docker

    - name: Get GKE credentials
      run: |
        gcloud container clusters get-credentials $GKE_CLUSTER \
          --zone $GKE_ZONE \
          --project $PROJECT_ID

    - name: Build Auth Service
      run: |
        cd backend
        docker build -t gcr.io/$PROJECT_ID/auth-service:$GITHUB_SHA \
          -f Dockerfile.auth .
        docker push gcr.io/$PROJECT_ID/auth-service:$GITHUB_SHA

    - name: Build Listing Service
      run: |
        cd backend
        docker build -t gcr.io/$PROJECT_ID/listing-service:$GITHUB_SHA \
          -f Dockerfile.listings .
        docker push gcr.io/$PROJECT_ID/listing-service:$GITHUB_SHA

    - name: Build Order Service
      run: |
        cd backend
        docker build -t gcr.io/$PROJECT_ID/order-service:$GITHUB_SHA \
          -f Dockerfile.orders .
        docker push gcr.io/$PROJECT_ID/order-service:$GITHUB_SHA

    - name: Deploy to GKE
      run: |
        kubectl set image deployment/auth-service \
          auth-service=gcr.io/$PROJECT_ID/auth-service:$GITHUB_SHA \
          -n twentyfourx-prod

        kubectl set image deployment/listing-service \
          listing-service=gcr.io/$PROJECT_ID/listing-service:$GITHUB_SHA \
          -n twentyfourx-prod

        kubectl set image deployment/order-service \
          order-service=gcr.io/$PROJECT_ID/order-service:$GITHUB_SHA \
          -n twentyfourx-prod

    - name: Verify deployment
      run: |
        kubectl rollout status deployment/auth-service -n twentyfourx-prod
        kubectl rollout status deployment/listing-service -n twentyfourx-prod
        kubectl rollout status deployment/order-service -n twentyfourx-prod
```

### Dockerfile Example (Auth Service)

```dockerfile
# Dockerfile.auth
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY src/auth ./src/auth
COPY src/common ./src/common
COPY src/users ./src/users
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
ENV PORT=8081

EXPOSE 8081

CMD ["node", "dist/auth/main.js"]
```

---

## 8. AI Agent Implementation

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              User (Chat Interface)                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────┐
│          AI Agent Service (NestJS)                   │
│  ┌────────────────────────────────────────────────┐ │
│  │   Conversation Manager                         │ │
│  │   - Context tracking (Redis)                   │ │
│  │   - Session management                         │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │   Claude API Client (Anthropic SDK)            │ │
│  │   - Model: claude-3-5-sonnet-20241022          │ │
│  │   - Tool use / Function calling                │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │   Action Executor                              │ │
│  │   - Database operations                        │ │
│  │   - API calls to other services                │ │
│  │   - Real-time UI manipulation                  │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Implementation

**1. AI Agent Service Setup:**

```typescript
// src/ai-agent/ai-agent.service.ts
import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class AIAgentService {
  private anthropic: Anthropic;
  private redis: Redis;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    this.redis = new Redis(process.env.REDIS_URL);
  }

  // Available tools for Claude
  private tools = [
    {
      name: 'search_users',
      description: 'Search for users by name, email, or other criteria',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          filters: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['SELLER', 'TRADER', 'ADMIN'] },
              status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
            },
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_user_medicines',
      description: 'Get all medicines/listings owned by a user',
      input_schema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'delete_user',
      description: 'Delete a user and all their data (requires confirmation)',
      input_schema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to delete' },
          confirmed: { type: 'boolean', description: 'Confirmation flag' },
        },
        required: ['userId', 'confirmed'],
      },
    },
    {
      name: 'search_medicines',
      description: 'Search medicines by name, composition, or manufacturer',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          page: { type: 'number', description: 'Page number for pagination' },
          limit: { type: 'number', description: 'Results per page' },
        },
        required: ['query'],
      },
    },
    {
      name: 'update_listing_price',
      description: 'Update the price of a listing',
      input_schema: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          newPrice: { type: 'number' },
        },
        required: ['listingId', 'newPrice'],
      },
    },
    {
      name: 'generate_report',
      description: 'Generate various reports (sales, inventory, users)',
      input_schema: {
        type: 'object',
        properties: {
          reportType: { type: 'string', enum: ['sales', 'inventory', 'users'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
        required: ['reportType'],
      },
    },
  ];

  async chat(userId: string, message: string): Promise<any> {
    // Get conversation history from Redis
    const conversationKey = `conversation:${userId}`;
    const history = await this.redis.lrange(conversationKey, 0, -1);
    const messages = history.map(h => JSON.parse(h));

    // Add user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API with tool use
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools: this.tools,
      messages: messages,
    });

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(c => c.type === 'tool_use');

      if (toolUse) {
        // Execute the tool
        const toolResult = await this.executeAction(toolUse.name, toolUse.input);

        // Continue conversation with tool result
        messages.push({ role: 'assistant', content: response.content });
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult),
            },
          ],
        });

        // Get final response from Claude
        const finalResponse = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: messages,
        });

        // Save conversation to Redis
        await this.redis.rpush(conversationKey, JSON.stringify({
          role: 'user',
          content: message,
        }));
        await this.redis.rpush(conversationKey, JSON.stringify({
          role: 'assistant',
          content: finalResponse.content,
        }));
        await this.redis.expire(conversationKey, 3600); // 1 hour TTL

        return {
          message: finalResponse.content[0].text,
          toolUsed: toolUse.name,
          toolResult: toolResult,
        };
      }
    }

    // Regular response without tool use
    await this.redis.rpush(conversationKey, JSON.stringify({
      role: 'user',
      content: message,
    }));
    await this.redis.rpush(conversationKey, JSON.stringify({
      role: 'assistant',
      content: response.content,
    }));
    await this.redis.expire(conversationKey, 3600);

    return {
      message: response.content[0].text,
    };
  }

  private async executeAction(toolName: string, input: any): Promise<any> {
    switch (toolName) {
      case 'search_users':
        return this.searchUsers(input.query, input.filters);

      case 'get_user_medicines':
        return this.getUserMedicines(input.userId);

      case 'delete_user':
        if (!input.confirmed) {
          return {
            status: 'confirmation_required',
            message: 'Are you sure you want to delete this user? This action cannot be undone.'
          };
        }
        return this.deleteUser(input.userId);

      case 'search_medicines':
        return this.searchMedicines(input.query, input.page || 1, input.limit || 20);

      case 'update_listing_price':
        return this.updateListingPrice(input.listingId, input.newPrice);

      case 'generate_report':
        return this.generateReport(input.reportType, input.startDate, input.endDate);

      default:
        return { error: 'Unknown tool' };
    }
  }

  private async searchUsers(query: string, filters?: any) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        ...(filters?.role && { roleCode: filters.role }),
        ...(filters?.status && { status: filters.status }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleCode: true,
        status: true,
        createdAt: true,
      },
      take: 10,
    });

    return { users, count: users.length };
  }

  private async getUserMedicines(userId: string) {
    const listings = await this.prisma.listing.findMany({
      where: { sellerId: userId },
      include: {
        medicine: {
          include: {
            manufacturer: true,
          },
        },
      },
    });

    return {
      userId,
      totalListings: listings.length,
      listings: listings.map(l => ({
        id: l.id,
        medicine: l.medicine.name,
        manufacturer: l.medicine.manufacturer.name,
        price: l.basePrice,
        stock: l.stock,
        status: l.status,
      })),
    };
  }

  private async deleteUser(userId: string) {
    // Use transaction for safe deletion
    await this.prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.listing.deleteMany({ where: { sellerId: userId } });
      await tx.buyProposal.deleteMany({ where: { buyerId: userId } });
      await tx.order.deleteMany({ where: { buyerId: userId } });
      await tx.notification.deleteMany({ where: { userId } });

      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });

    return {
      status: 'success',
      message: `User ${userId} and all related data deleted successfully.`
    };
  }

  private async searchMedicines(query: string, page: number, limit: number) {
    const medicines = await this.prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { composition: { contains: query, mode: 'insensitive' } },
          { manufacturer: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        manufacturer: true,
        listings: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { basePrice: 'asc' },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      medicines: medicines.map(m => ({
        id: m.id,
        name: m.name,
        composition: m.composition,
        manufacturer: m.manufacturer.name,
        lowestPrice: m.listings[0]?.basePrice || null,
      })),
      page,
      total: medicines.length,
    };
  }

  private async updateListingPrice(listingId: string, newPrice: number) {
    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { basePrice: newPrice },
    });

    return {
      status: 'success',
      listingId: listing.id,
      oldPrice: listing.basePrice,
      newPrice: newPrice,
    };
  }

  private async generateReport(type: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    switch (type) {
      case 'sales':
        const orders = await this.prisma.order.findMany({
          where: {
            createdAt: { gte: start, lte: end },
          },
          include: {
            listing: {
              include: {
                medicine: true,
              },
            },
          },
        });

        const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

        return {
          reportType: 'sales',
          period: { start, end },
          totalOrders: orders.length,
          totalRevenue: totalSales,
          averageOrderValue: totalSales / orders.length,
        };

      case 'inventory':
        const listings = await this.prisma.listing.findMany({
          where: { status: 'ACTIVE' },
          include: { medicine: true },
        });

        return {
          reportType: 'inventory',
          totalListings: listings.length,
          totalStock: listings.reduce((sum, l) => sum + l.stock, 0),
          lowStockItems: listings.filter(l => l.stock < 100).length,
        };

      case 'users':
        const users = await this.prisma.user.findMany({
          where: {
            createdAt: { gte: start, lte: end },
          },
        });

        return {
          reportType: 'users',
          period: { start, end },
          newUsers: users.length,
          breakdown: {
            sellers: users.filter(u => u.roleCode === 'SELLER').length,
            traders: users.filter(u => u.roleCode === 'TRADER').length,
            approved: users.filter(u => u.status === 'APPROVED').length,
            pending: users.filter(u => u.status === 'PENDING').length,
          },
        };
    }
  }
}
```

**2. Frontend Chat Component:**

```typescript
// components/AIChat.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

export default function AIChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        toolUsed: data.toolUsed,
      }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div className={`max-w-xl rounded-lg p-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p>{msg.content}</p>
              {msg.toolUsed && (
                <p className="text-xs mt-2 opacity-70">
                  🔧 Used: {msg.toolUsed}
                </p>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything... (e.g., 'Find users with pending KYC' or 'Show me medicines containing paracetamol')"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### AI Agent Capabilities

**Example Conversations:**

```
User: "Show me all sellers who registered in the last week"
Agent: [Uses search_users tool with date filter]
      "I found 12 sellers who registered in the last 7 days:
       1. ABC Pharma - abc@example.com (Pending KYC)
       2. XYZ Medical - xyz@example.com (Approved)
       ..."

User: "What medicines does ABC Pharma have?"
Agent: [Uses get_user_medicines tool]
      "ABC Pharma has 45 active listings:
       - Paracetamol 500mg (100 units, ₹5.50)
       - Azithromycin 250mg (50 units, ₹12.00)
       ..."

User: "Delete user with email spam@test.com"
Agent: [Uses delete_user tool, asks for confirmation]
      "⚠️ This will permanently delete the user and all their data.
       Are you sure you want to continue?"

User: "Yes, delete them"
Agent: [Executes deletion]
      "✅ User deleted successfully along with 5 listings and 2 orders."

User: "Search for medicines containing 'amoxicillin'"
Agent: [Uses search_medicines tool]
      "Found 23 medicines with amoxicillin:
       1. Amoxycillin 500mg - Cipla - ₹3.50
       2. Amoxycillin & Clavulanate 625mg - Sun Pharma - ₹8.00
       ..."

User: "Generate a sales report for last month"
Agent: [Uses generate_report tool]
      "📊 Sales Report (Jan 2026):
       - Total Orders: 1,234
       - Total Revenue: ₹5,67,890
       - Average Order Value: ₹460
       - Top Medicine: Paracetamol (450 orders)"
```

---

## 9. Additional Scaling Tools

### 1. Redis (Caching & Session Management)

**Setup Cloud Memorystore:**
```bash
gcloud redis instances create 24rx-redis \
  --size=6 \
  --region=us-central1 \
  --redis-version=redis_6_x
```

**Usage in NestJS:**
```typescript
// src/common/redis.service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: 6379,
    });
  }

  async cacheListings(key: string, data: any, ttl: number = 300) {
    await this.client.setex(key, ttl, JSON.stringify(data));
  }

  async getCachedListings(key: string): Promise<any | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateCache(pattern: string) {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

### 2. Elasticsearch (Advanced Search)

**Kubernetes Deployment:**
```yaml
# elasticsearch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: discovery.type
          value: "single-node"
        - name: ES_JAVA_OPTS
          value: "-Xms512m -Xmx512m"
        ports:
        - containerPort: 9200
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

**Index Medicines:**
```typescript
// src/search/elasticsearch.service.ts
import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL,
    });
  }

  async indexMedicine(medicine: any) {
    await this.client.index({
      index: 'medicines',
      id: medicine.id,
      document: {
        name: medicine.name,
        composition: medicine.composition,
        manufacturer: medicine.manufacturer.name,
        form: medicine.form,
        strength: medicine.strength,
        mrp: medicine.mrp,
      },
    });
  }

  async searchMedicines(query: string, page: number = 1, limit: number = 20) {
    const result = await this.client.search({
      index: 'medicines',
      from: (page - 1) * limit,
      size: limit,
      query: {
        multi_match: {
          query: query,
          fields: ['name^3', 'composition^2', 'manufacturer'],
          fuzziness: 'AUTO',
        },
      },
    });

    return {
      hits: result.hits.hits.map(hit => hit._source),
      total: result.hits.total,
    };
  }
}
```

### 3. Prometheus & Grafana (Monitoring)

**Install Prometheus Stack:**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

**Custom Metrics:**
```typescript
// src/common/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestCounter: Counter;
  private httpRequestDuration: Histogram;

  constructor() {
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });
  }

  incrementRequest(method: string, route: string, status: number) {
    this.httpRequestCounter.inc({ method, route, status });
  }

  recordDuration(method: string, route: string, duration: number) {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  getMetrics() {
    return register.metrics();
  }
}
```

### 4. Distributed Tracing (Jaeger)

**Install Jaeger:**
```bash
kubectl create namespace observability
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
kubectl apply -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/service_account.yaml
kubectl apply -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role.yaml
kubectl apply -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role_binding.yaml
kubectl apply -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/operator.yaml
```

---

## 10. Migration Plan

### Phase 1: Server Upgrade (Week 1)
- [ ] Backup current database
- [ ] Create GKE cluster
- [ ] Set up Cloud SQL (PostgreSQL)
- [ ] Set up Cloud Memorystore (Redis)
- [ ] Migrate database to Cloud SQL
- [ ] Deploy current monolith to GKE
- [ ] Update DNS to point to new cluster
- [ ] Monitor for 48 hours

### Phase 2: Extract Auth Service (Week 2)
- [ ] Create auth service codebase
- [ ] Set up Kafka cluster
- [ ] Implement auth service APIs
- [ ] Deploy auth service to GKE
- [ ] Update frontend to use auth service
- [ ] Migrate JWT validation
- [ ] A/B test auth service (10% traffic)
- [ ] Gradual rollout to 100%

### Phase 3: Extract Listing Service (Week 3)
- [ ] Create listing service codebase
- [ ] Implement search with Elasticsearch
- [ ] Set up CSV processing with Bull queue
- [ ] Deploy listing service
- [ ] Migrate listing routes
- [ ] Kafka events for listing updates
- [ ] Performance testing

### Phase 4: Extract Order Service (Week 4)
- [ ] Create order service codebase
- [ ] Implement invoice generation
- [ ] Payment gateway integration
- [ ] Deploy order service
- [ ] Kafka events for orders
- [ ] End-to-end testing

### Phase 5: Notification & Media Services (Week 5)
- [ ] Extract notification service
- [ ] Set up email queue with Bull
- [ ] Extract media service
- [ ] Implement image processing pipeline
- [ ] Deploy both services
- [ ] Test email delivery
- [ ] Test image uploads

### Phase 6: AI Agent Service (Week 6-7)
- [ ] Set up Claude API integration
- [ ] Implement tool use framework
- [ ] Build action executors
- [ ] Create chat interface
- [ ] Deploy AI service
- [ ] Beta testing with admin users
- [ ] Expand tool capabilities

### Phase 7: CI/CD Setup (Week 8)
- [ ] Create GitHub Actions workflows
- [ ] Set up Docker image builds
- [ ] Automate deployments
- [ ] Add automated tests
- [ ] Set up staging environment
- [ ] Implement blue-green deployments

### Phase 8: Monitoring & Optimization (Week 9-10)
- [ ] Set up Prometheus metrics
- [ ] Create Grafana dashboards
- [ ] Implement distributed tracing
- [ ] Load testing
- [ ] Performance optimization
- [ ] Cost optimization

---

## 11. Cost Analysis

### Current Setup
```
GCP VM (e2-small): $15/month
Total: ~$15/month
```

### Upgraded Monolith (Option A)
```
GCP VM (e2-standard-4):     $120/month
Disk (100GB SSD):           $17/month
Total:                      ~$137/month
```

### Full Microservices (Option B)
```
GKE Cluster (3 × e2-standard-4):  $360/month
Cloud SQL (db-custom-4-16384):    $280/month
Cloud Memorystore (Redis 6GB):    $45/month
Kafka on GKE (3 brokers):         $120/month
Elasticsearch (3 nodes):          $150/month
Cloud Storage (1TB):              $20/month
Load Balancer:                    $18/month
Egress (estimated):               $50/month
Claude API (10K messages/month):  $30/month
Total:                            ~$1,073/month
```

### Cost Optimization Tips
1. Use Preemptible VMs for non-critical workloads (-60% cost)
2. Implement autoscaling (scale down during low traffic)
3. Use Cloud CDN for static assets
4. Optimize database queries to reduce CPU
5. Compress Kafka messages
6. Use committed use discounts (-30% for 1-year)

**Optimized Cost:** ~$650-700/month

---

## 12. Resume-Worthy Technologies

### What to Highlight on Resume

**Architecture & Design:**
- ✅ Microservices Architecture
- ✅ Event-Driven Architecture (Kafka)
- ✅ Domain-Driven Design (DDD)
- ✅ CQRS (Command Query Responsibility Segregation)
- ✅ API Gateway Pattern

**Container Orchestration:**
- ✅ Kubernetes (GKE)
- ✅ Docker Containerization
- ✅ Helm Charts
- ✅ Service Mesh (Istio - optional)

**Backend Technologies:**
- ✅ NestJS (Node.js framework)
- ✅ TypeScript
- ✅ PostgreSQL with Prisma ORM
- ✅ Redis Caching
- ✅ Apache Kafka Event Streaming

**Cloud & DevOps:**
- ✅ Google Cloud Platform (GCP)
- ✅ CI/CD with GitHub Actions
- ✅ Infrastructure as Code (Terraform - optional)
- ✅ Cloud SQL, Cloud Storage, Memorystore

**Observability:**
- ✅ Prometheus Monitoring
- ✅ Grafana Dashboards
- ✅ Distributed Tracing (Jaeger)
- ✅ Centralized Logging (ELK Stack)

**AI/ML:**
- ✅ AI Agent Development
- ✅ Claude API Integration (Anthropic)
- ✅ LangChain Tool Use
- ✅ Context-Aware Chatbots
- ✅ Production ML Systems

**Search & Performance:**
- ✅ Elasticsearch Full-Text Search
- ✅ Redis Caching Strategies
- ✅ Database Query Optimization
- ✅ Horizontal Pod Autoscaling

**Security:**
- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ API Rate Limiting
- ✅ Secrets Management (Kubernetes Secrets)

### Sample Resume Bullet Points

```
• Architected and implemented microservices-based pharmaceutical trading platform
  serving 500+ concurrent users, achieving 99.9% uptime using Kubernetes on GCP

• Designed event-driven architecture using Apache Kafka with 3 brokers processing
  100K+ messages/day, reducing API response time by 60%

• Built production-grade AI agent system using Claude API with tool use capabilities,
  enabling natural language database operations and automated admin workflows

• Implemented distributed tracing with Jaeger and monitoring with Prometheus/Grafana,
  reducing mean time to resolution (MTTR) for incidents by 70%

• Established CI/CD pipeline using GitHub Actions, Docker, and Kubernetes, enabling
  15+ deployments per week with zero-downtime releases

• Optimized search performance by 10x using Elasticsearch with custom analyzers,
  handling 10K+ queries/minute across 100K+ product listings

• Reduced infrastructure costs by 40% through Kubernetes autoscaling, Redis caching,
  and query optimization while maintaining sub-200ms API response times
```

---

## Next Steps

1. **Choose Migration Path:**
   - Quick win: Upgrade current VM (1 week)
   - Long-term: Full microservices (10 weeks)

2. **Start Small:**
   - Week 1: Upgrade server to e2-standard-4
   - Week 2: Add Redis caching
   - Week 3: Set up GKE cluster
   - Week 4: Extract first service

3. **Learn & Experiment:**
   - Set up local Kubernetes with Minikube
   - Practice Kafka locally with Docker Compose
   - Test Claude API integration
   - Build proof-of-concept AI agent

4. **Document Everything:**
   - Architecture diagrams
   - API specifications (OpenAPI)
   - Deployment procedures
   - Incident response playbooks

---

## Resources & Learning

**Kubernetes:**
- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)

**Apache Kafka:**
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Strimzi Operator](https://strimzi.io/)

**AI Agents:**
- [Anthropic Claude API](https://docs.anthropic.com/)
- [LangChain Documentation](https://python.langchain.com/)

**Microservices:**
- [Microservices Patterns (Chris Richardson)](https://microservices.io/)
- [Building Microservices (Sam Newman)](https://samnewman.io/books/building_microservices_2nd_edition/)

**Observability:**
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/)

---

**This document provides a complete roadmap for scaling 24Rx from a monolithic application to an enterprise-grade, microservices-based platform with AI capabilities. Follow the migration plan step-by-step, and you'll have an impressive, production-ready system that stands out on your resume!**
