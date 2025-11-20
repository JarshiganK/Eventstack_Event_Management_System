# EventStack

EventStack is a robust full-stack event management platform designed to connect event organizers with attendees. It provides a comprehensive suite of tools for managing events, tracking expenses, and discovering new activities. The project is built with a modern technology stack, featuring a React frontend and a Fastify backend.

## ✨ Features

- **User Authentication**: Secure registration and login for attendees and organizers.
- **Event Management**: Admins can create, update, and manage event listings.
- **Event Discovery**: Users can browse, search, and view detailed information about events.
- **Bookmarking**: Attendees can save events they are interested in.
- **Expense Tracking**: Organizers can manage event budgets and track expenses.
- **AI-Powered Budget Bot**: An intelligent assistant to help with budget planning (requires Gemini API key).
- **Admin & Organizer Dashboards**: Dedicated interfaces for managing events and finances.

## 🛠️ Tech Stack

This project is a monorepo composed of a frontend application and a backend server.

- **Frontend**:
  - **Framework**: React
  - **Build Tool**: Vite
  - **Language**: TypeScript
  - **Routing**: React Router
  - **Testing**: Vitest, React Testing Library

- **Backend**:
  - **Framework**: Fastify
  - **Language**: TypeScript
  - **Runtime**: Node.js
  - **Database**: PostgreSQL
  - **Validation**: Zod
  - **Authentication**: JWT
  - **Testing**: Vitest

## 📂 Project Structure

The project is organized into two main packages within the `apps` directory:

```
eventstack/
├── apps/
│   ├── backend/   # Fastify server, database logic, and API endpoints
│   └── frontend/  # React client application and UI components
├── deploy-eventstack.ps1  # Automated deployment script
├── tsconfig.base.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or later)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/download/)
- [PowerShell](https://learn.microsoft.com/en-us/powershell/) (for automated deployment on Windows)

### Quick Start (Automated Deployment)

The easiest way to set up EventStack is using the automated PowerShell deployment script. This script handles database setup, environment configuration, dependency installation, and server startup automatically.

1. **Clone the Repository**:
   ```sh
   git clone <YOUR_REPOSITORY_URL>
   cd eventstack
   ```

2. **Run the Deployment Script**:
   ```powershell
   .\deploy-eventstack.ps1
   ```

   The script will:
   - Check for required tools (psql, npm, node)
   - Create the database if it doesn't exist
   - Apply the database schema
   - Create/update the backend `.env` file
   - Install dependencies for both backend and frontend
   - Start both servers in separate windows

   **⚠️ Security Warning**: The script uses default values for database password and JWT secret. **You should override these in production or for any shared environment.**

3. **Deployment Script Parameters**:

   The script accepts the following parameters with their default values:

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

4. **Customize Deployment** (examples):
   ```powershell
   # Override default password and JWT secret (RECOMMENDED)
   .\deploy-eventstack.ps1 -DbPassword "YourSecurePassword123" -JwtSecret "your-super-secret-jwt-key-min-6-chars"

   # Custom database settings
   .\deploy-eventstack.ps1 -DbName "myeventstack" -DbUser "myuser" -DbPassword "mypassword"

   # Custom ports
   .\deploy-eventstack.ps1 -BackendPort 5000 -FrontendPort 3000

   # Load sample data
   .\deploy-eventstack.ps1 -LoadSampleData

   # Multiple customizations
   .\deploy-eventstack.ps1 -DbPassword "SecurePass" -JwtSecret "MySecretKey" -BackendPort 8080 -LoadSampleData

   # Skip specific steps (useful for partial deployments)
   .\deploy-eventstack.ps1 -SkipDb -SkipBackend

   # Production frontend build
   .\deploy-eventstack.ps1 -ProdFrontend

   # Custom CORS origins (for multiple frontend instances)
   .\deploy-eventstack.ps1 -CorsOrigins "http://localhost:5173,http://localhost:3000"
   ```

   For all available options, run:
   ```powershell
   Get-Help .\deploy-eventstack.ps1 -Full
   ```

5. **Cleanup**: When you're done, press `ENTER` in the deployment script window to clean up services and optionally drop the database. Press `CTRL+C` to exit without dropping the database.

**Important Security Notes**:
- The default database password (`Jarshi17225`) and JWT secret (`change-me-now`) are **not secure** and should be changed for any non-local development environment.
- Always use strong, unique passwords and JWT secrets in production.
- The JWT secret must be at least 6 characters long.

### Manual Setup

If you prefer to set up the project manually or are on a non-Windows system:

#### 1. Clone the Repository

```sh
git clone <YOUR_REPOSITORY_URL>
cd eventstack
```

#### 2. Database Setup

1. Make sure your PostgreSQL server is running.
2. Create a new database:
   ```sh
   createdb eventstack
   ```
3. Apply the schema:
   ```sh
   psql -d eventstack -f apps/backend/database/schema.sql
   ```
4. (Optional) Load sample data:
   ```sh
   psql -d eventstack -f apps/backend/database/sample_data.sql
   ```

#### 3. Environment Configuration

Navigate to the backend directory and create a `.env` file:

```sh
cd apps/backend
```

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME"
JWT_SECRET="your-super-secret-jwt-key-minimum-6-characters"
CORS_ORIGINS="http://localhost:5173"
GEMINI_API_KEY=""  # Optional: Required for AI Budget Bot features
```

**Required Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing (minimum 6 characters)
- `PORT`: Backend server port (default: 4000)

**Optional Variables**:
- `CORS_ORIGINS`: Comma-separated list of allowed origins (default: `http://localhost:5173`)
- `GEMINI_API_KEY`: API key for Google Gemini (required for Budget Bot features)

#### 4. Install Dependencies

Install dependencies for both packages:

```sh
# Backend
cd apps/backend
npm install

# Frontend
cd ../frontend
npm install
```

## 🏃‍♂️ Running the Application

### Using the Deployment Script

The deployment script automatically starts both servers. Simply run:
```powershell
.\deploy-eventstack.ps1
```

### Manual Execution

Run both servers in separate terminal windows:

**Backend Server**:
```sh
cd apps/backend
npm run dev
```
The backend will start on `http://localhost:4000` (or the port specified in `.env`).

**Frontend Application**:
```sh
cd apps/frontend
npm run dev
```
The frontend will start on `http://localhost:5173`.

## 🧪 Running Tests

Both packages are equipped with a comprehensive suite of unit and integration tests using Vitest.

### Test Scripts

Navigate to the package directory (`apps/backend` or `apps/frontend`) and use the following scripts:

- `npm test`: Run all tests once
- `npm run test:watch`: Run tests in watch mode
- `npm run testu`: Run unit tests and generate a coverage report
- `npm run testi`: Run integration tests and generate a coverage report
- `npm run test:coverage`: Run all tests and generate a combined coverage report
- `npm run test:report`: Generate PDF reports from coverage results for both unit and integration tests

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

