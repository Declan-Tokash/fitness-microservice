# 🏋️ Fitness Microservice Platform

A modern, distributed microservices architecture for a comprehensive fitness tracking and AI-powered recommendation system. Built with Spring Boot, Spring Cloud, and cloud-native technologies.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Services](#services)
- [Technology Stack](#technology-stack)
- [Setup & Installation](#setup--installation)
- [Running the System](#running-the-system)
- [API Endpoints](#api-endpoints)
- [Data Flow](#data-flow)
- [Configuration](#configuration)

---

## 🎯 Overview

The Fitness Microservice Platform is a scalable, cloud-native fitness tracking application that:

- **Manages User Profiles**: Registration, authentication, and profile management via Keycloak OAuth2
- **Tracks Activities**: Records fitness activities (workouts, exercises) with real-time event processing
- **Generates AI Recommendations**: Uses Google Gemini AI to provide personalized fitness recommendations
- **Routes Requests**: API Gateway handles all client requests with OAuth2 security
- **Discovers Services**: Eureka service discovery for dynamic service registration
- **Manages Configuration**: Centralized config server for environment-specific settings
- **Handles Events**: Asynchronous message processing with RabbitMQ

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│                  (Frontend / Mobile / Web)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │      API Gateway (Port 8080)                │
        │  - Route requests to services              │
        │  - OAuth2 JWT validation                   │
        │  - Keycloak user sync filter               │
        └──────────────────┬─────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐    ┌──────────────┐   ┌──────────────┐
    │  USER   │    │   ACTIVITY   │   │      AI      │
    │ SERVICE │    │   SERVICE    │   │   SERVICE    │
    │ (8081)  │    │   (8082)     │   │   (8083)     │
    └────┬────┘    └──────┬───────┘   └──────┬───────┘
         │                │                   │
         │      ┌─────────┴───────┐           │
         │      │                 │           │
         ▼      ▼                 ▼           ▼
    ┌────────────────┐   ┌──────────────┐  ┌──────────┐
    │  PostgreSQL    │   │  MongoDB     │  │ RabbitMQ │
    │  (User DB)     │   │  (Activities)│  │  (Events)│
    └────────────────┘   └──────────────┘  └──────────┘
         │                     │
         │      ┌──────────────┘
         │      │
         └──────┴─── Eureka Registry (8761)
                │
         ┌──────┴──────────────┐
         │                     │
         ▼                     ▼
    ┌──────────────┐   ┌──────────────┐
    │Config Server │   │  Keycloak    │
    │    (8888)    │   │  (8181)      │
    └──────────────┘   └──────────────┘
```

### Component Interaction Flow

```
                          OAuth2 Flow
┌─────────────────────────────────────────────────┐
│                                                 │
│  Client   ──────────────────────►  Keycloak    │
│   (App)   ◄──── JWT Token ────────  (Auth)     │
│           Authorization: Bearer <token>         │
└─────────────────────────────────────────────────┘
                     │
                     │ Forward with JWT
                     ▼
          ┌──────────────────────┐
          │   API Gateway        │
          │  ┌────────────────┐  │
          │  │SecurityConfig  │  │ (Validate JWT)
          │  └────────────────┘  │
          │  ┌────────────────┐  │ (Route by path)
          │  │Route Predicates│  │
          │  └────────────────┘  │
          └──────────────────────┘
         │                │          │
    Route to:      Route to:    Route to:
         │                │          │
         ▼                ▼          ▼
    /api/users/   /api/activities/ /api/recommendations/
         │                │          │
         ▼                ▼          ▼
      USER           ACTIVITY        AI
    SERVICE         SERVICE       SERVICE
```

---

## 🔧 Services

### 1. **API Gateway** (Port 8080)
**Purpose**: Single entry point for all client requests

**Key Features**:
- Route requests to backend services based on URL patterns
- OAuth2 JWT validation and enforcement
- Keycloak user synchronization filter
- Load balanced service discovery

**Routes**:
```
GET/POST  /api/users/**         → User Service (8081)
GET/POST  /api/activities/**    → Activity Service (8082)
GET/POST  /api/recommendations/** → AI Service (8083)
```

**Config**: `configserver/src/main/resources/config/api-gateway.yml`

---

### 2. **User Service** (Port 8081)
**Purpose**: Manage user authentication, profiles, and validation

**Database**: PostgreSQL (`fitness_user_db`)

**Key Features**:
- User registration with Keycloak OAuth2 integration
- User profile management (CRUD)
- User existence validation
- JWT token validation

**Endpoints**:
```
POST   /api/users/register              → Register new user
GET    /api/users/{userId}              → Get user profile
GET    /api/users/{userId}/validate     → Validate user exists
```

**Entity Model**:
```
User {
  id: UUID
  keycloakId: String (from OAuth2)
  email: String
  password: String (encrypted)
  firstName: String
  lastName: String
  role: UserRole (USER, ADMIN)
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}
```

**Config**: `configserver/src/main/resources/config/user-service.yml`

---

### 3. **Activity Service** (Port 8082)
**Purpose**: Track and manage fitness activities in real-time

**Database**: MongoDB (`fitnessactivity`)

**Message Broker**: RabbitMQ (Async event processing)

**Key Features**:
- Record fitness activities (workouts, exercises)
- Retrieve activity history
- Real-time event publishing to message queue
- Activity statistics and aggregations

**Endpoints**:
```
POST   /api/activities              → Create new activity
GET    /api/activities/{userId}     → Get user activities
GET    /api/activities/stats/{userId} → Get activity statistics
PUT    /api/activities/{activityId}    → Update activity
```

**Entity Model**:
```
Activity {
  _id: ObjectId
  userId: String
  activityType: String (RUNNING, CYCLING, GYM, YOGA, etc.)
  duration: Integer (in minutes)
  distance: Double (in km)
  caloriesBurned: Integer
  intensity: String (LOW, MEDIUM, HIGH)
  startTime: LocalDateTime
  endTime: LocalDateTime
  notes: String
  createdAt: LocalDateTime
  updatedAt: LocalDateTime
}
```

**Message Queue Config**:
```
Exchange: fitness-exchange
Queue:    activity.queue
Routing Key: activity.tracking
```

**Config**: `configserver/src/main/resources/config/activity-service.yml`

---

### 4. **AI Service** (Port 8083)
**Purpose**: Generate AI-powered fitness recommendations

**Database**: MongoDB (`fitnessactivity`)

**External API**: Google Gemini API

**Key Features**:
- Analyze user activity patterns
- Generate personalized fitness recommendations
- ML-based fitness goal suggestions
- Integration with Gemini AI

**Endpoints**:
```
GET    /api/recommendations/{userId}     → Get personalized recommendations
POST   /api/recommendations/generate      → Generate new recommendations
GET    /api/recommendations/{userId}/history → Get recommendation history
```

**Recommendation Model**:
```
Recommendation {
  _id: ObjectId
  userId: String
  recommendations: List<String>
  basedOnActivities: List<ActivitySummary>
  generatedAt: LocalDateTime
  expiresAt: LocalDateTime
  type: String (WEEKLY, MONTHLY)
}
```

**Config**: `configserver/src/main/resources/config/ai-service.yml`

**Environment Variables**:
```
GEMINI_API_URL=https://generativelanguage.googleapis.com
GEMINI_API_KEY=<your-api-key>
```

---

### 5. **Config Server** (Port 8888)
**Purpose**: Centralized configuration management

**Features**:
- Environment-specific configs (dev, prod, staging)
- Dynamic config updates without service restart
- Version-controlled configuration

**Configs Managed**:
- `api-gateway.yml` → API Gateway configuration
- `user-service.yml` → User Service configuration
- `activity-service.yml` → Activity Service configuration
- `ai-service.yml` → AI Service configuration

---

### 6. **Eureka Server** (Port 8761)
**Purpose**: Service discovery and registration

**Features**:
- Services auto-register on startup
- Service health monitoring
- Load balancing across service instances
- Client-side load balancing

**Service Registration**:
```
USER-SERVICE          → 8081 (registered as USER-SERVICE)
ACTIVITY-SERVICE      → 8082 (registered as ACTIVITY-SERVICE)
AI-SERVICE            → 8083 (registered as AI-SERVICE)
api-gateway           → 8080 (registered as api-gateway)
CONFIG-SERVER         → 8888 (registered as config-server)
```

---

## 💻 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Runtime** | Java | 21 |
| **Framework** | Spring Boot | 4.1.0 |
| **Cloud Platform** | Spring Cloud | 2025.1.2 |
| **API Gateway** | Spring Cloud Gateway | 2025.1.2 |
| **Service Discovery** | Netflix Eureka | (Spring Cloud) |
| **Config Management** | Spring Cloud Config | (Spring Cloud) |
| **User Database** | PostgreSQL | 12+ |
| **Activity Database** | MongoDB | 4.0+ |
| **Message Broker** | RabbitMQ | 3.8+ |
| **Authentication** | Keycloak + OAuth2 | 21+ |
| **AI Integration** | Google Gemini API | Latest |
| **Frontend** | React | (See fitness-app-frontend) |
| **Build Tool** | Maven | 3.6+ |

---

## 📦 Setup & Installation

### Prerequisites

Before running the system, ensure you have:

1. **Java 21+** installed
   ```bash
   java -version
   ```

2. **Maven 3.6+** installed
   ```bash
   mvn -version
   ```

3. **Docker & Docker Compose** (for databases)
   ```bash
   docker --version
   docker-compose --version
   ```

4. **PostgreSQL Client** (optional, for manual DB access)

5. **Git** for cloning repository

### Step 1: Clone Repository

```bash
git clone https://github.com/Declan-Tokash/fitness-microservice.git
cd fitness-microservice
```

### Step 2: Start Infrastructure (Docker)

Create a `docker-compose.yml` file at the root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: declantokash
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fitness_user_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: fitnessactivity
    volumes:
      - mongodb_data:/data/db

  rabbitmq:
    image: rabbitmq:3.11-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    ports:
      - "8181:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: declantokash
      KC_DB_PASSWORD: password
    depends_on:
      - postgres

volumes:
  postgres_data:
  mongodb_data:
  rabbitmq_data:
```

Start services:
```bash
docker-compose up -d
```

Verify services:
```bash
docker-compose ps
```

### Step 3: Build All Services

```bash
# Build all modules
mvn clean install -DskipTests

# Or build specific services
cd eureka && mvn clean package && cd ..
cd configserver && mvn clean package && cd ..
cd gateway && mvn clean package && cd ..
cd userservice && mvn clean package && cd ..
cd activityservice && mvn clean package && cd ..
cd aiservice && mvn clean package && cd ..
```

### Step 4: Configure Environment Variables

```bash
# For AI Service
export GEMINI_API_URL=https://generativelanguage.googleapis.com
export GEMINI_API_KEY=your-actual-gemini-api-key
```

---

## 🚀 Running the System

### Start Services in Order

**Terminal 1: Eureka Server**
```bash
cd eureka
mvn spring-boot:run
# Accessible at: http://localhost:8761
```

**Terminal 2: Config Server**
```bash
cd configserver
mvn spring-boot:run
# Accessible at: http://localhost:8888
```

**Terminal 3: User Service**
```bash
cd userservice
mvn spring-boot:run
```

**Terminal 4: Activity Service**
```bash
cd activityservice
mvn spring-boot:run
```

**Terminal 5: AI Service**
```bash
cd aiservice
mvn spring-boot:run
```

**Terminal 6: API Gateway**
```bash
cd gateway
mvn spring-boot:run
# Accessible at: http://localhost:8080
```

### Verify All Services

```bash
# Check Eureka Dashboard
curl http://localhost:8761

# Check Config Server
curl http://localhost:8888/api-gateway/default

# Check Gateway Health
curl http://localhost:8080/actuator/health
```

---

## 📡 API Endpoints

### User Service (`/api/users`)

**Register User**
```http
POST /api/users/register
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "keycloakId": "keycloak-user-id"
}

Response: 201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-08-16T10:30:00Z"
}
```

**Get User Profile**
```http
GET /api/users/{userId}
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-08-16T10:30:00Z"
}
```

**Validate User**
```http
GET /api/users/{userId}/validate
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
true
```

---

### Activity Service (`/api/activities`)

**Create Activity**
```http
POST /api/activities
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "activityType": "RUNNING",
  "duration": 45,
  "distance": 8.5,
  "caloriesBurned": 650,
  "intensity": "HIGH",
  "startTime": "2024-08-16T06:00:00Z",
  "endTime": "2024-08-16T06:45:00Z",
  "notes": "Morning run in the park"
}

Response: 201 Created
{
  "_id": "...",
  "userId": "...",
  "activityType": "RUNNING",
  "duration": 45,
  "distance": 8.5,
  "caloriesBurned": 650,
  "createdAt": "2024-08-16T10:30:00Z"
}
```

**Get User Activities**
```http
GET /api/activities?userId={userId}
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
[
  {
    "_id": "...",
    "userId": "...",
    "activityType": "RUNNING",
    "duration": 45,
    "distance": 8.5,
    "caloriesBurned": 650,
    "createdAt": "2024-08-16T10:30:00Z"
  }
]
```

**Get Activity Statistics**
```http
GET /api/activities/stats/{userId}
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "totalActivities": 45,
  "totalDuration": 1800,
  "totalDistance": 342.5,
  "totalCaloriesBurned": 28500,
  "averageIntensity": "MEDIUM",
  "lastActivityDate": "2024-08-16T06:45:00Z"
}
```

---

### AI Service (`/api/recommendations`)

**Get Personalized Recommendations**
```http
GET /api/recommendations/{userId}
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "_id": "...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "recommendations": [
    "Increase cardio frequency to 5 times per week for better cardiovascular health",
    "Add strength training on non-running days",
    "Focus on longer runs on weekends for endurance building",
    "Maintain consistent pace during runs"
  ],
  "basedOnActivities": [...],
  "generatedAt": "2024-08-16T10:30:00Z",
  "type": "WEEKLY"
}
```

**Generate New Recommendations**
```http
POST /api/recommendations/generate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "WEEKLY"
}

Response: 201 Created
{
  "_id": "...",
  "userId": "...",
  "recommendations": [...],
  "generatedAt": "2024-08-16T10:30:00Z"
}
```

---

## 🔄 Data Flow

### User Registration & Sync Flow

```
1. User logs in via Keycloak OAuth2
   ├─ Redirected to Keycloak (8181)
   ├─ User authenticates
   └─ JWT token returned

2. Request arrives at API Gateway (8080)
   ├─ SecurityConfig validates JWT
   └─ KeycloakUserSyncFilter intercepts

3. KeycloakUserSyncFilter processes
   ├─ Extracts user info from JWT claims
   ├─ Checks if user exists in system
   └─ If not exists → calls User Service to register

4. User Service validates & registers
   ├─ Stores user in PostgreSQL
   ├─ Sets keycloakId from JWT
   └─ Returns user response

5. Request continues through gateway
   └─ Routes to target service
```

### Activity Tracking & Recommendation Flow

```
1. User logs activity via mobile/web
   └─ POST /api/activities

2. API Gateway routes to Activity Service
   └─ Activity Service (8082)

3. Activity Service processes
   ├─ Validates activity data
   ├─ Stores in MongoDB
   └─ Publishes event to RabbitMQ

4. RabbitMQ broadcasts event
   ├─ Exchange: fitness-exchange
   ├─ Queue: activity.queue
   └─ Routing Key: activity.tracking

5. AI Service consumes event (async)
   ├─ Listens to RabbitMQ
   └─ Updates activity metrics

6. User requests recommendations
   └─ GET /api/recommendations/{userId}

7. AI Service processes
   ├─ Retrieves user activity history from MongoDB
   ├─ Calls Google Gemini API
   ├─ Generates personalized recommendations
   └─ Returns recommendations

8. Response back to client
   └─ Recommendations displayed in app
```

---

## ⚙️ Configuration

### Database Configuration

**PostgreSQL (User Service)**
```yaml
# configserver/src/main/resources/config/user-service.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/fitness_user_db
    username: declantokash
    password: password
  jpa:
    hibernate:
      ddl-auto: update
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

**MongoDB (Activity & AI Services)**
```yaml
# For both activity-service.yml and ai-service.yml
spring:
  mongodb:
    uri: mongodb://localhost:27017/fitnessactivity
    database: fitnessactivity
```

### Message Broker Configuration

**RabbitMQ**
```yaml
# Configured in both activity-service.yml and ai-service.yml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest

rabbitmq:
  exchange:
    name: fitness-exchange
  queue:
    name: activity.queue
  routing:
    key: activity.tracking
```

### OAuth2 & Security Configuration

**Keycloak**
```yaml
# configserver/src/main/resources/config/api-gateway.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8181/realms/fitness-oauth2
```

**Setup Keycloak Realm**
1. Navigate to http://localhost:8181/admin
2. Login with admin/admin
3. Create realm: `fitness-oauth2`
4. Create client: `fitness-app`
5. Configure CORS and valid redirects

### Service Discovery Configuration

**Eureka Client**
```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: http://localhost:8761/eureka
  instance:
    prefer-ip-address: true
```

---

## 🧪 Testing

### Run Unit Tests

```bash
# All services
mvn clean test

# Specific service
cd userservice && mvn clean test
```

### Manual API Testing

Using cURL:
```bash
# 1. Get JWT token from Keycloak
TOKEN=$(curl -X POST http://localhost:8181/realms/fitness-oauth2/protocol/openid-connect/token \
  -d "client_id=fitness-app" \
  -d "username=testuser" \
  -d "password=testpass" \
  -d "grant_type=password" | jq -r '.access_token')

# 2. Create user
curl -X POST http://localhost:8080/api/users/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User",
    "keycloakId": "keycloak-id"
  }'

# 3. Create activity
curl -X POST http://localhost:8080/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "activityType": "RUNNING",
    "duration": 45,
    "distance": 8.5,
    "caloriesBurned": 650,
    "intensity": "HIGH"
  }'

# 4. Get recommendations
curl -X GET http://localhost:8080/api/recommendations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Monitoring & Observability

### Endpoints

- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Admin**: http://localhost:15672 (guest/guest)
- **Config Server**: http://localhost:8888
- **Keycloak Admin**: http://localhost:8181/admin (admin/admin)
- **API Gateway Health**: http://localhost:8080/actuator/health

### Logs

View service logs:
```bash
# User Service
tail -f userservice/logs/userservice.log

# Activity Service
tail -f activityservice/logs/activityservice.log

# AI Service
tail -f aiservice/logs/aiservice.log
```

---

## 🐛 Troubleshooting

### Services not registering in Eureka

**Problem**: Services not appearing in Eureka dashboard
```bash
# Check service logs for errors
mvn spring-boot:run | grep -i eureka
```

**Solution**: Ensure Eureka server is running on port 8761

### Database connection errors

**Problem**: `SQLException: Connection refused`
```bash
# Verify Docker services are running
docker-compose ps

# Restart if needed
docker-compose down
docker-compose up -d
```

### JWT validation failing

**Problem**: `401 Unauthorized` on gateway requests
```bash
# Check token format
echo $TOKEN | jq .

# Verify Keycloak is running
curl http://localhost:8181
```

### AI Service not responding

**Problem**: `/api/recommendations` returns 500
```bash
# Check Gemini API key is set
echo $GEMINI_API_KEY

# Verify MongoDB connection
mongo mongodb://localhost:27017/fitnessactivity
```

---

## 🚢 Deployment

### Docker Build

```bash
# Build individual service images
cd userservice
docker build -t fitness-userservice:1.0 .
docker push your-registry/fitness-userservice:1.0

# Similar for other services
```

### Kubernetes Deployment (Optional)

Example manifest structure:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  ports:
    - port: 8081
  selector:
    app: user-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: fitness-userservice:1.0
```

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Support

For issues and questions:
- Open GitHub Issues
- Contact: declantokash@example.com

---

## 🎯 Future Enhancements

- [ ] WebSocket support for real-time activity notifications
- [ ] Mobile push notifications integration
- [ ] Advanced analytics dashboard
- [ ] Social features (friend connections, challenges)
- [ ] Payment integration for premium features
- [ ] Machine learning models for activity predictions
- [ ] GraphQL API gateway
- [ ] Service mesh (Istio) integration
- [ ] Distributed tracing (Jaeger)
- [ ] Advanced caching layer (Redis)

---

**Last Updated**: August 16, 2024  
**Version**: 1.0.0  
**Maintainer**: Declan Tokash
