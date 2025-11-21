# EventStack

**Production-Ready Event Management Platform**

Full-stack event management • AI-powered budgeting • Real-time analytics

**Status** Tests Coverage

---

## What is this?

EventStack is a comprehensive full-stack event management platform designed to connect event organizers with attendees. It provides a complete suite of tools for managing events, tracking expenses, discovering activities, and engaging with attendees through intelligent features.

Built with modern web technologies and best practices, EventStack offers a seamless experience for both event organizers and attendees, from event discovery to budget management.

---

## Key Features

### User Authentication
- Secure registration and login for attendees and organizers
- Role-based access control (Admin, Organizer, Attendee)
- JWT-based authentication with secure token management

### Event Management
- Admins can create, update, and manage event listings
- Rich event details with image uploads
- Event categorization and filtering
- Venue management

###  Event Discovery
- Advanced search functionality
- Browse and filter events by category, date, and location
- Detailed event information pages
- Bookmark favorite events

### Expense Tracking
- Organizers can manage event budgets
- Track expenses with detailed records
- Budget analysis and reporting
- Financial dashboard for organizers

### AI-Powered Budget Bot
- Intelligent assistant for budget planning
- Real-time budget recommendations
- Integration with Google Gemini API
- Smart expense categorization

### Admin & Organizer Dashboards
- Dedicated interfaces for managing events
- Financial overview and analytics
- User management capabilities
- Complete system control

---

## How It Works

### System Architecture

1. **Frontend (React + Vite)**
   - Modern, responsive user interface
   - Real-time updates and interactions
   - Client-side routing and state management

2. **Backend (Fastify + Node.js)**
   - RESTful API endpoints
   - Database operations and business logic
   - Authentication and authorization
   - File upload handling

3. **Database (PostgreSQL)**
   - Relational data storage
   - User, event, and expense management
   - Optimized queries and relationships

4. **AI Integration (Google Gemini)**
   - Budget planning assistance
   - Intelligent recommendations
   - Natural language processing

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend Framework** | React 18.3 |
| **Build Tool** | Vite 5.4 |
| **Frontend Language** | TypeScript 5.9 |
| **Routing** | React Router 6.26 |
| **Backend Framework** | Fastify 4.27 |
| **Backend Language** | TypeScript 5.9 |
| **Runtime** | Node.js 20+ |
| **Database** | PostgreSQL |
| **Validation** | Zod 3.23 |
| **Authentication** | JWT (jsonwebtoken) |
| **Testing** | Vitest 4.0, React Testing Library |
| **File Upload** | @fastify/multipart |

---

## Quick Start

### One Command Deployment

```powershell
# Run with default settings
.\deploy-eventstack.ps1

# Or customize with parameters
.\deploy-eventstack.ps1 -DbPassword "YourPassword" -JwtSecret "YourSecret" -BackendPort 4000

# Load sample data
.\deploy-eventstack.ps1 -LoadSampleData

# When done, press ENTER to automatically cleanup everything
```

### Access Your System

-  **Frontend**: http://localhost:5173
-  **Backend API**: http://localhost:4000
-  **Database**: localhost:5432

**Automatic Cleanup**: Press `ENTER` when finished to stop all services, close windows, and optionally drop the database (unless `CTRL+C` is pressed to keep the database).

### Deployment Script Parameters

**Database Configuration**:
- `-DbName` (default: `eventstack`) - PostgreSQL database name
- `-DbHost` (default: `localhost`) - PostgreSQL server host
- `-DbPort` (default: `5432`) - PostgreSQL server port
- `-DbUser` (default: `postgres`) - PostgreSQL username
- `-DbPassword` (default: `Changeme`) - **⚠️ Change this default password!**

**Server Configuration**:
- `-BackendHost` (default: `localhost`) - Backend server host
- `-BackendPort` (default: `4000`) - Backend server port
- `-FrontendHost` (default: `localhost`) - Frontend server host
- `-FrontendPort` (default: `5173`) - Frontend server port

**Security Configuration**:
- `-JwtSecret` (default: `change-me-now`) - **⚠️ Change this default JWT secret!**
- `-CorsOrigins` (default: `http://localhost:5173`) - Comma-separated CORS origins

**Deployment Options** (switches):
- `-SkipDb` - Skip database setup
- `-SkipBackend` - Skip backend installation and startup
- `-SkipFrontend` - Skip frontend installation and startup
- `-LoadSampleData` - Load sample data into the database
- `-ProdFrontend` - Build and serve production frontend (instead of dev server)

### Example Customizations

```powershell
# Override default password and JWT secret (RECOMMENDED)
.\deploy-eventstack.ps1 -DbPassword "YourSecurePassword123" -JwtSecret "your-super-secret-jwt-key-min-6-chars"

# Custom database settings
.\deploy-eventstack.ps1 -DbName "myeventstack" -DbUser "myuser" -DbPassword "mypassword"

# Custom ports
.\deploy-eventstack.ps1 -BackendPort 5000 -FrontendPort 3000

# Multiple customizations
.\deploy-eventstack.ps1 -DbPassword "SecurePass" -JwtSecret "MySecretKey" -BackendPort 8080 -LoadSampleData
```

 **Need more details?** Check the deployment guide for all available parameters and options.

---

##  System Highlights

 **Production Ready** - Fully tested and deployment-ready

 **Comprehensive Testing** - 60+ test files covering unit and integration tests

 **High Code Coverage** - 89%+ coverage across frontend and backend

 **Secure** - JWT authentication, password hashing, input validation

 **Modern UI** - Responsive design for mobile and desktop

 **Fast & Efficient** - Fastify backend, Vite frontend build

 **Easy Setup** - Single-script automated deployment

 **Type Safe** - Full TypeScript implementation

---

##  Running Tests

Both packages are equipped with comprehensive test suites using Vitest.

### Test Scripts

Navigate to the package directory (`apps/backend` or `apps/frontend`) and use:

- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run testu` - Run unit tests with coverage
- `npm run testi` - Run integration tests with coverage
- `npm run test:coverage` - Run all tests with combined coverage
- `npm run test:report` - Generate PDF coverage reports

### Examples

**Backend Tests**:
```sh
cd apps/backend
npm test                    # Run all tests
npm run testu              # Unit tests with coverage
npm run testi              # Integration tests with coverage
npm run test:report        # Generate PDF coverage reports
```

**Frontend Tests**:
```sh
cd apps/frontend
npm test                    # Run all tests
npm run testu              # Unit tests with coverage
npm run testi              # Integration tests with coverage
```

Coverage reports are generated in the `coverage/` directory, and PDF reports are available in `tests/reports/` for each package.

---

##  Project Structure

```
eventstack/
├── apps/
│   ├── backend/          # Fastify server, database logic, and API endpoints
│   │   ├── src/          # Source code
│   │   ├── database/     # SQL schema and sample data
│   │   └── tests/        # Unit and integration tests
│   └── frontend/         # React client application
│       ├── src/          # Source code
│       └── tests/        # Unit and integration tests
├── deploy-eventstack.ps1 # Automated deployment script
├── tsconfig.base.json    # Shared TypeScript configuration
└── README.md
```

---

##  Manual Setup

If you prefer to set up the project manually or are on a non-Windows system:

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or later)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/download/)

### Steps

1. **Clone the Repository**:
   ```sh
   git clone <YOUR_REPOSITORY_URL>
   cd eventstack
   ```

2. **Database Setup**:
   ```sh
   createdb eventstack
   psql -d eventstack -f apps/backend/database/schema.sql
   # Optional: Load sample data
   psql -d eventstack -f apps/backend/database/sample_data.sql
   ```

3. **Environment Configuration**:
   
   Create `apps/backend/.env`:
   ```env
   NODE_ENV=development
   PORT=4000
   DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME"
   JWT_SECRET="your-super-secret-jwt-key-minimum-6-characters"
   CORS_ORIGINS="http://localhost:5173"
   GEMINI_API_KEY=""  # Optional: Required for AI Budget Bot features
   ```

4. **Install Dependencies**:
   ```sh
   cd apps/backend && npm install
   cd ../frontend && npm install
   ```

5. **Run the Application**:
   ```sh
   # Backend (in one terminal)
   cd apps/backend
   npm run dev
   
   # Frontend (in another terminal)
   cd apps/frontend
   npm run dev
   ```

---

## ⚠️ Security Notes

- The default database password (`Changeme`) and JWT secret (`change-me-now`) are **not secure** and should be changed for any non-local development environment.
- Always use strong, unique passwords and JWT secrets in production.
- The JWT secret must be at least 6 characters long.
- Never commit `.env` files or sensitive credentials to version control.

---


##  Academic Context

**Course**: Computer Engineering Project  
**Institution**: University of Peradeniya  
**Year**: 2024-2025

This project demonstrates the integration of modern web technologies, database management, AI integration, and best practices in software development to create a production-ready event management platform.

---

*Transforming event experiences through intelligent technology*
