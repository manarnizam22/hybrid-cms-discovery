# Hybrid CMS + Discovery System

A scalable hybrid Content Management and Discovery System capable of handling up to 10 million users per hour, combining on-premise infrastructure with AWS cloud services for optimal performance, security, and cost efficiency.

## Architecture Overview

### Hybrid Architecture
- **On-Premise (Self-Hosted)**: Core CMS services, PostgreSQL database, Redis cache
- **AWS Cloud**: Scalable discovery endpoints, OpenSearch, S3 storage, SQS messaging, Lambda functions

### Technology Stack

#### Backend
- **Framework**: NestJS
- **API**: GraphQL (CMS) + REST (Discovery)
- **Database**: PostgreSQL (self-hosted)
- **Cache**: Redis
- **Search**: Amazon OpenSearch

#### AWS Services
- **S3**: Media file storage (audio, images)
- **SQS**: Asynchronous message queuing for data synchronization
- **OpenSearch**: Full-text search and indexing
- **Lambda**: Serverless discovery endpoints
- **API Gateway**: Public API exposure

#### Infrastructure
- **Containers**: Docker
- **Orchestration**: Kubernetes
- **Deployment**: Serverless Framework

## System Components

### 1. Content Management System (CMS)
- **GraphQL API** for managing shows and episodes
- Full CRUD operations for shows and episodes
- Media upload to S3
- Automatic indexing via SQS on data changes

**GraphQL Endpoints:**
- `POST /graphql` - GraphQL playground (development)
- Mutations: `createShow`, `updateShow`, `deleteShow`, `createEpisode`, `updateEpisode`, `deleteEpisode`
- Queries: `show`, `shows`, `episode`, `episodes`

### 2. Discovery & Search System
- **REST API** for public search and discovery
- Fast search with OpenSearch
- Redis caching for performance
- Filtering by category, language, duration

**REST Endpoints:**
- `GET /discovery/search?q=query&category=X&language=Y` - Search content
- `GET /discovery/featured?limit=10` - Get featured content

### 3. Data Synchronization
- **Change Data Capture (CDC)**: PostgreSQL triggers notify on data changes
- **SQS Integration**: Asynchronous message queuing
- **Eventual Consistency**: Data syncs to OpenSearch and Redis asynchronously
- **Retry Mechanisms**: Automatic retry on failures

### 4. AWS Lambda Functions
- **discovery-search**: Serverless search endpoint
- **discovery-featured**: Serverless featured content endpoint
- **sqs-processor**: Processes indexing messages from SQS queue

## Project Structure

```
.
├── src/
│   ├── cms/                 # CMS module (GraphQL)
│   │   ├── entities/        # Show and Episode entities
│   │   ├── cms.service.ts   # Business logic
│   │   └── cms.resolver.ts  # GraphQL resolvers
│   ├── discovery/           # Discovery module (REST)
│   │   ├── discovery.service.ts
│   │   └── discovery.controller.ts
│   ├── sync/                # Data synchronization
│   │   ├── sync.service.ts  # CDC and sync logic
│   │   └── sqs-processor.controller.ts
│   ├── aws/                 # AWS service integrations
│   │   ├── s3.service.ts
│   │   ├── sqs.service.ts
│   │   └── opensearch.service.ts
│   ├── cache/               # Redis caching
│   │   └── cache.service.ts
│   ├── common/              # Shared utilities
│   │   ├── retry.util.ts
│   │   ├── guards/
│   │   └── interceptors/
│   └── health/              # Health check endpoint
├── lambda/                  # AWS Lambda functions
│   ├── discovery-search/
│   ├── discovery-featured/
│   └── sqs-processor/
├── k8s/                     # Kubernetes configurations
│   ├── deployment.yaml
│   ├── postgres-deployment.yaml
│   └── redis-deployment.yaml
├── scripts/                 # Database initialization scripts
│   └── init-db-triggers.sql
├── docker-compose.yml        # Local development
├── Dockerfile               # Container image
├── serverless.yml           # Serverless Framework config
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- AWS Account (for cloud services)
- Kubernetes cluster (for production deployment)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Copy the example file and update with your values:
```bash
cp env.example .env
```

Then edit `.env` with your actual configuration values. See `env.example` for all available options.

3. **Start local services with Docker:**
```bash
docker-compose up -d
```

4. **Initialize database triggers (for CDC):**
```bash
psql $DATABASE_URL -f scripts/init-db-triggers.sql
```

5. **Run the application:**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Access Points
- **GraphQL Playground**: http://localhost:3000/graphql
- **REST API**: http://localhost:3000/discovery/search
- **Health Check**: http://localhost:3000/health

## Deployment

### Docker Deployment

1. **Build the image:**
```bash
docker build -t cms-app:latest .
```

2. **Run with docker-compose:**
```bash
docker-compose up -d
```

### Kubernetes Deployment

1. **Create secrets:**
```bash
kubectl create secret generic cms-secrets \
  --from-literal=db-username=postgres \
  --from-literal=db-password=your-password \
  --from-literal=aws-access-key-id=your-key \
  --from-literal=aws-secret-access-key=your-secret
```

2. **Update ConfigMap in `k8s/deployment.yaml`** with your AWS endpoints

3. **Deploy:**
```bash
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/deployment.yaml
```

### AWS Lambda Deployment

1. **Install Serverless Framework:**
```bash
npm install -g serverless
```

2. **Configure AWS credentials:**
```bash
aws configure
```

3. **Deploy Lambda functions:**
```bash
# Development
npm run deploy:lambda:dev

# Production
npm run deploy:lambda:prod
```

4. **Deploy with Serverless directly:**
```bash
cd lambda && npm install
cd .. && serverless deploy --stage dev
```

## API Usage Examples

### GraphQL (CMS)

**Create a Show:**
```graphql
mutation {
  createShow(input: {
    title: "My Podcast"
    description: "A great podcast"
    category: "Technology"
    language: "en"
  }) {
    id
    title
    createdAt
  }
}
```

**Create an Episode:**
```graphql
mutation {
  createEpisode(input: {
    title: "Episode 1"
    description: "First episode"
    episodeNumber: 1
    duration: 3600
    audioUrl: "https://s3.amazonaws.com/bucket/audio.mp3"
    showId: "show-uuid"
  }) {
    id
    title
    duration
  }
}
```

**Query Shows:**
```graphql
query {
  shows {
    id
    title
    category
    episodes {
      id
      title
      duration
    }
  }
}
```

### REST API (Discovery)

**Search:**
```bash
curl "http://localhost:3000/discovery/search?q=technology&category=Tech&language=en"
```

**Featured Content:**
```bash
curl "http://localhost:3000/discovery/featured?limit=10"
```

### REST API (Media Upload)

**Upload Audio/Image:**
```bash
curl -X POST -F "file=@audio.mp3" http://localhost:3000/cms/upload/audio
curl -X POST -F "file=@image.jpg" http://localhost:3000/cms/upload/images
```

## Performance & Scalability

### Target Performance
- **~2,800 requests per second** (~10M users/hour)
- **Sub-millisecond** cache response times
- **Eventual consistency** for scalability

### Optimization Strategies
1. **Redis Caching**: Search results cached for 5 minutes
2. **OpenSearch**: Offloads search queries from database
3. **Lambda Auto-scaling**: Handles traffic spikes automatically
4. **Kubernetes HPA**: Horizontal Pod Autoscaler (3-50 pods based on CPU/memory)
5. **Connection Pooling**: Efficient database connections
6. **Rate Limiting**: API throttling at application and ingress levels
7. **Ingress Rate Limiting**: 3000 requests/second at ingress controller

## Security Features

1. **Encryption in Transit**: HTTPS/TLS for all communications
2. **Encryption at Rest**: S3 server-side encryption (AES256)
3. **API Key Authentication**: Optional API key guard
4. **CORS Configuration**: Configurable allowed origins
5. **Input Validation**: Class-validator with decorators for all inputs
6. **SQL Injection Protection**: TypeORM parameterized queries
7. **Rate Limiting**: In-memory rate limiting middleware (100 req/min per IP)
8. **File Upload Validation**: MIME type and file size restrictions
9. **Global Exception Filter**: Secure error handling without leaking internals

## Data Flow

1. **Content Creation**: 
   - User creates/updates show/episode via GraphQL
   - Data saved to PostgreSQL (source of truth)
   - SQS message sent for indexing

2. **Change Detection**:
   - PostgreSQL trigger fires on data change
   - CDC listener receives notification
   - Sync service processes change

3. **Indexing**:
   - SQS processor Lambda receives message
   - Data synced to OpenSearch
   - Cache invalidated in Redis

4. **Search Request**:
   - User queries discovery endpoint
   - Check Redis cache first
   - If miss, query OpenSearch
   - Cache result for future requests

## Monitoring & Health Checks

- **Health Endpoint**: `GET /health`
- **Logging**: Request/response logging interceptor
- **Error Handling**: Retry mechanisms with exponential backoff
- **Dead Letter Queue**: Failed SQS messages go to DLQ

## Development

### Scripts
```bash
npm run start:dev      # Development with hot reload
npm run build          # Build for production
npm run start:prod     # Run production build
npm run lint           # Lint code
npm run test           # Run tests
npm run deploy:lambda  # Deploy Lambda functions
```

### Database Migrations
TypeORM handles schema synchronization in development. For production, use migrations:
```bash
npm run typeorm migration:generate -- -n MigrationName
npm run typeorm migration:run
```

## Best Practices Implemented

1. **SOLID Principles**: Single responsibility, dependency injection
2. **Retry Mechanisms**: Exponential backoff for external services
3. **Error Handling**: Comprehensive error handling and logging
4. **Type Safety**: TypeScript throughout
5. **Code Organization**: Modular architecture
6. **Environment Configuration**: Centralized config management
7. **Health Checks**: Kubernetes-ready health endpoints

## Future Enhancements

- Semantic search capabilities
- CDN integration for media delivery
- Advanced observability (Prometheus, Grafana)
- Multi-region deployment
- GraphQL subscriptions for real-time updates
- Advanced analytics and reporting