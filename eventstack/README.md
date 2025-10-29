# EventStack

EventStack is a robust full-stack event management platform designed to connect event organizers with attendees. It provides a comprehensive suite of tools for managing events, tracking expenses, and discovering new activities. The project is built with a modern technology stack, featuring a React frontend and a Fastify backend.

## ✨ Features

- **User Authentication**: Secure registration and login for attendees and organizers.
- **Event Management**: Admins can create, update, and manage event listings.
- **Event Discovery**: Users can browse, search, and view detailed information about events.
- **Bookmarking**: Attendees can save events they are interested in.
- **Expense Tracking**: Organizers can manage event budgets and track expenses.
- **AI-Powered Budget Bot**: An intelligent assistant to help with budget planning.
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
├── tsconfig.base.json
└── README.md
```

## 🚀 Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or later)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/download/)

### 1. Clone the Repository

```sh
git clone <YOUR_REPOSITORY_URL>
cd eventstack
```

### 2. Database Setup

1.  Make sure your PostgreSQL server is running.
2.  Create a new database for the project.
3.  Execute the schema and sample data scripts to initialize your database:
    - Run the contents of `apps/backend/database/schema.sql` to create the tables.
    - (Optional) Run the contents of `apps/backend/database/sample_data.sql` to populate the database with initial data.

### 3. Environment Configuration

The backend requires environment variables to connect to the database and manage security settings.

1.  Navigate to the backend directory:
    ```sh
    cd apps/backend
    ```
2.  Create a `.env` file by copying the example:
    ```sh
    # You may need to create this file
    touch .env
    ```
3.  Add the following required environment variables to the `.env` file. Replace the placeholder values with your actual configuration.

    ```env
    # PostgreSQL Connection URL
    DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME"

    # JWT Secret for signing tokens
    JWT_SECRET="your-super-secret-jwt-key"

    # Server Configuration
    HOST="0.0.0.0"
    PORT="8080"
    ```

### 4. Install Dependencies

Install the dependencies for both the backend and frontend.

- **Backend**:
  ```sh
  cd apps/backend
  npm install
  ```

- **Frontend**:
  ```sh
  cd ../frontend
  npm install
  ```

## 🏃‍♂️ Running the Application

You need to run both the backend and frontend servers simultaneously in separate terminal windows.

- **Run the Backend Server**:
  ```sh
  # From the apps/backend directory
  npm run dev
  ```
  The backend server will start on the port specified in your `.env` file (default: `8080`).

- **Run the Frontend Application**:
  ```sh
  # From the apps/frontend directory
  npm run dev
  ```
  The React development server will start, typically on `http://localhost:5173`.

## 🧪 Running Tests

Both packages are equipped with a full suite of unit and integration tests using Vitest.

To run the tests for a specific package, navigate to its directory and use the following scripts:

- `npm test`: Run all tests once.
- `npm run test:watch`: Run tests in watch mode.
- `npm run testu`: Run unit tests and generate a coverage report.
- `npm run testi`: Run integration tests and generate a coverage report.
- `npm run test:coverage`: Run all tests and generate a combined coverage report.
- `npm run test:report`: Generate PDF reports from the coverage results for both unit and integration tests.

**Example: Running backend tests**
```sh
cd apps/backend
npm test
```

