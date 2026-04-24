# DMAQ Task Management API

Production-ready NestJS task management API in an Nx monorepo. It includes JWT authentication, role-based authorization, task CRUD, admin analytics, validation, centralized error handling, Docker support, Swagger docs, rate limiting, CI, and Jest unit/integration tests.

## Tech Stack

- Node.js, TypeScript, NestJS
- Nx monorepo
- MongoDB-compatible persistence through Mongoose, ready for Azure Cosmos DB Mongo API
- Passport JWT authentication
- Jest for unit and integration tests
- Docker and Docker Compose
- Bull plus Redis for async task reminder jobs
- Swagger/OpenAPI and Nest throttling

## Monorepo Layout

```text
apps/
  api/          NestJS HTTP API
  api-e2e/      API integration tests
auth/           Register/login, JWT strategy, auth guards, role decorator
models/         DTOs, enums, Mongoose schemas
data-access/    Mongo/Cosmos repositories
tasks/          Task controller, service, reminder processor
users/          User module
analytics/      Admin task analytics
utils/          Exception filter and logging interceptor
```

## Environment

Copy `.env.example` to `.env` and adjust values as needed.

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/tasksdb
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=3600s
REDIS_HOST=localhost
REDIS_PORT=6379
```

For Azure Cosmos DB, set `MONGO_URI` to the Cosmos DB Mongo API connection string. Keep TLS and retry settings in the connection string as required by your Azure account.

## Local Development

```sh
npm install
npm run start:dev
```

API: `http://localhost:3000`

Swagger docs: `http://localhost:3000/api/docs`

## Docker Workflow

Start the API, MongoDB local substitute for Cosmos DB, and Redis:

```sh
docker compose up --build
```

Stop services:

```sh
docker compose down
```

The Dockerfile builds the Nx Nest app in a builder stage and runs only the compiled API in the final image as a non-root user.

## Scripts

```sh
npm run start:dev     # serve the API through Nx
npm run build         # production build
npm test              # Jest unit + integration tests
npm run test:cov      # Jest coverage report
npm run lint          # lint API project
```

## API Summary

### Auth

- `POST /auth/register` registers a user with email and password.
- `POST /auth/login` returns a JWT access token and role.

### Tasks

All task routes require `Authorization: Bearer <token>`.

- `POST /tasks` creates a task linked to the authenticated user.
- `GET /tasks` returns own tasks for `USER`, all tasks for `ADMIN`.
- `GET /tasks?status=TODO&page=2&limit=10` supports status filtering and pagination.
- `GET /tasks/:id` returns a task when requester is owner or admin.
- `PUT /tasks/:id` updates a task when requester is owner or admin.
- `DELETE /tasks/:id` deletes a task when requester is owner or admin.

### Analytics

- `GET /analytics/tasks` is admin-only and returns task counts by status, average completion time, and per-user task counts.

## Roles

- `USER`: can manage only their own tasks.
- `ADMIN`: can manage all tasks and read analytics.

New registrations default to `USER`. Admin accounts can be seeded or updated directly in the database for review/demo environments.

## Testing

The suite includes service, guard, strategy, utility, controller, and API integration coverage. The integration test boots a real Nest application with JWT guards and mocked data-access repositories, which keeps it fast and independent from an external Cosmos/Mongo service.

```sh
npm test
npm run test:cov
```

Coverage output is written under `coverage/`.

## Resiliency

- DTO validation uses a global `ValidationPipe` and returns `400` for invalid payloads.
- `AllExceptionsFilter` centralizes API error responses.
- Mongoose connection options include bounded server selection and connection timeouts for graceful database failure behavior.
- Repository and service layers return proper Nest HTTP exceptions such as `401`, `403`, `404`, and `409`.

## CI

GitHub Actions runs install, lint, tests with coverage, and production build on pushes and pull requests to `main`, `master`, and `develop`.
