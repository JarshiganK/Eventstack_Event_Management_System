# server.ts Documentation

## File Location
`apps/backend/src/server.ts`

## Overview
The server.ts file exports the `buildServer()` function that creates and configures a Fastify web server with all necessary plugins and routes for the EventStack backend application.

## Imports

```typescript
// Fast web server framework
import Fastify from "fastify";
// Allow requests from other websites (CORS)
import cors from "@fastify/cors";
// Handle file uploads
import multipart from "@fastify/multipart";
// Get list of allowed websites from environment
import { corsOriginList } from "./env.js";

// Import all our API route handlers
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import uploadRoutes from "./routes/uploads.js";
import searchRoutes from "./routes/search.js";
import adminRoutes from "./routes/admin.js";
import expensesRoutes from "./routes/expenses.js";
import budgetBotRoutes from "./routes/budgetBot.js";

// File system utilities
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
// Serve static files (like uploaded images)
import fastifyStatic from "@fastify/static";
```

## Main Function: buildServer

### Purpose
Creates and configures a Fastify server instance with all middleware, routes, and static file serving.

### Function Signature
```typescript
export async function buildServer(): Promise<FastifyInstance>
```

### Return Value
Returns a configured Fastify server instance ready to listen for requests.

## Server Configuration

### 1. Create Fastify Instance
```typescript
const app = Fastify({ logger: true });
```
- **logger: true**: Enables built-in logging
- **Purpose**: Logs all requests and responses
- **Output**: Structured JSON logs

### 2. Register CORS Plugin
```typescript
await app.register(cors, { 
  origin: (origin, cb) => cb(null, !origin || corsOriginList.includes(origin)) 
});
```
- **Purpose**: Enables Cross-Origin Resource Sharing
- **Origin Check**: Only allows requests from whitelisted domains
- **Fallback**: Allows requests with no origin (like Postman/curl)
- **Security**: Prevents unauthorized websites from accessing API

### CORS Configuration Details
```typescript
origin: (origin, cb) => cb(null, !origin || corsOriginList.includes(origin))
```
- **Function**: Callback that checks origin
- **Parameters**:
  - `origin`: The origin header from the request
  - `cb`: Callback to approve/reject
- **Logic**: 
  - If no origin: allow (server-to-server)
  - If origin in whitelist: allow
  - Otherwise: reject

### 3. Register Multipart Plugin
```typescript
await app.register(multipart);
```
- **Purpose**: Enables file upload handling
- **Features**:
  - Parse multipart/form-data requests
  - Handle file uploads
  - Support for file streaming

### 4. Setup Static File Serving

#### Create Uploads Directory
```typescript
const uploadsDir = join(process.cwd(), "apps", "backend", "uploads");
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
```
- **Location**: `apps/backend/uploads/`
- **Auto-create**: Creates directory if it doesn't exist
- **recursive: true**: Creates parent directories if needed

#### Register Static File Plugin
```typescript
await app.register(fastifyStatic as any, { 
  root: uploadsDir, 
  prefix: "/uploads/" 
});
```
- **Purpose**: Serves uploaded files
- **Configuration**:
  - `root`: Directory to serve files from
  - `prefix`: URL prefix for requests
- **URL Mapping**: `/uploads/image.jpg` → `apps/backend/uploads/image.jpg`

### 5. Add Health Check Endpoint
```typescript
app.get("/api/health", async () => ({ ok: true }));
```
- **URL**: `GET /api/health`
- **Response**: `{ ok: true }`
- **Purpose**: 
  - Monitoring and uptime checks
  - Load balancer health checks
  - Simple connectivity test

## Route Registration

All routes are registered with the `/api` prefix:

### Auth Routes
```typescript
await app.register(authRoutes, { prefix: "/api" });
```
- **File**: `./routes/auth.js`
- **Endpoints**: Login, register, logout, etc.

### Event Routes
```typescript
await app.register(eventRoutes, { prefix: "/api" });
```
- **File**: `./routes/events.js`
- **Endpoints**: Create, read, update, delete events

### Bookmark Routes
```typescript
await app.register(bookmarkRoutes, { prefix: "/api" });
```
- **File**: `./routes/bookmarks.js`
- **Endpoints**: Add, remove bookmarks

### Upload Routes
```typescript
await app.register(uploadRoutes, { prefix: "/api" });
```
- **File**: `./routes/uploads.js`
- **Endpoints**: File upload handling

### Search Routes
```typescript
await app.register(searchRoutes, { prefix: "/api" });
```
- **File**: `./routes/search.js`
- **Endpoints**: Search events

### Expenses Routes
```typescript
await app.register(expensesRoutes, { prefix: "/api" });
```
- **File**: `./routes/expenses.js`
- **Endpoints**: Event expenses management

### Budget Bot Routes
```typescript
await app.register(budgetBotRoutes, { prefix: "/api" });
```
- **File**: `./routes/budgetBot.js`
- **Endpoints**: AI budget assistant

### Admin Routes
```typescript
await app.register(adminRoutes, { prefix: "/api" });
```
- **File**: `./routes/admin.js`
- **Endpoints**: Admin dashboard and management

## URL Structure

All API endpoints follow the pattern:
```
https://your-domain.com/api/{route}
```

### Examples
- Auth: `POST /api/login`, `POST /api/register`
- Events: `GET /api/events`, `POST /api/events`
- Uploads: `POST /api/uploads`
- Health: `GET /api/health`

## File Upload Flow

1. **Client sends multipart/form-data** to `/api/uploads`
2. **Multipart plugin** parses the request
3. **Upload route** saves file to `apps/backend/uploads/`
4. **Static plugin** serves files at `/uploads/{filename}`
5. **Client accesses file** at `https://domain.com/uploads/image.jpg`

## Plugin Registration Order

1. **CORS**: Applied first to handle cross-origin requests
2. **Multipart**: Needed before file upload routes
3. **Static**: Set up before serving uploads
4. **Routes**: Registered in dependency order

## Environment Variables Used

From `env.ts`:
- `CORS_ORIGINS`: List of allowed origins
- Automatically converted to `corsOriginList` array

## Return Statement

```typescript
return app;
```
- Returns fully configured server
- Can be used to listen on port
- Can be passed to tests for integration testing

## Usage in index.ts

```typescript
const app = await buildServer();
await app.listen({ port: env.PORT, host: "0.0.0.0" });
```
- Server is built and started in main entry point
- Listens on all network interfaces (0.0.0.0)
- Uses PORT from environment variables

## Server Lifecycle

1. **Startup**: buildServer() called
2. **Configuration**: Plugins registered
3. **Routes**: All routes mounted
4. **Ready**: Server ready to accept requests
5. **Runtime**: Handles incoming requests
6. **Shutdown**: Graceful shutdown on termination

## Key Features

### 1. Performance
- Fastify is one of the fastest Node.js frameworks
- Low overhead for routing and request handling
- Built-in compression and logging

### 2. Security
- CORS protection from unauthorized origins
- File upload validation (via upload routes)
- Environment-based configuration

### 3. Scalability
- Stateless design
- Easy horizontal scaling
- Health check endpoint for load balancing

### 4. Developer Experience
- Automatic logging
- TypeScript support
- Plugin architecture

### 5. File Serving
- Automatic directory creation
- Efficient static file serving
- Lazy loading of files

## Best Practices

1. **Plugin Order**: Register plugins in correct dependency order
2. **Error Handling**: Let Fastify handle errors automatically
3. **Security**: Always use CORS in production
4. **Logging**: Keep logging enabled for debugging
5. **Static Files**: Use dedicated static file plugin
6. **Environment**: Load configuration from environment variables

## Common Issues

### CORS Errors
- **Cause**: Origin not in whitelist
- **Fix**: Add origin to CORS_ORIGINS environment variable

### File Upload Fails
- **Cause**: Multipart plugin not registered
- **Fix**: Register multipart before upload routes

### Static Files Not Loading
- **Cause**: Directory doesn't exist
- **Fix**: Auto-creation handles this

### Port Already in Use
- **Cause**: Another process using the port
- **Fix**: Kill the process or change PORT environment variable

