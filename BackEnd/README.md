# MedEase AI Backend

The MedEase AI backend provides health checks and an authenticated educational assistant endpoint.

## What this phase includes

- Express.js server with TypeScript
- Environment validation using `dotenv` and `zod`
- CORS and security headers via `helmet` and `cors`
- Health endpoint at `GET /api/health`
- Authenticated assistant endpoint at `POST /api/assistant/chat`
- Basic error handling for missing routes and server errors
- Automated tests for the health route

## Why these files matter

### `src/app.ts`
This file creates the Express app. It is the central place where middleware such as CORS, JSON parsing, and route registration are configured. Think of it as the "main traffic controller" for the server.

### `src/server.ts`
This file starts the app and listens on a port. It is the entry point when you run the server.

### `src/config/env.ts`
This file reads environment variables and validates them. It prevents the app from starting with missing or invalid values such as a broken port number.

### `src/routes/health.routes.ts`
This route answers health-check requests. It is useful for local development, deployment monitoring, and CI checks.

### `src/middleware/errorHandler.ts`
This file centralizes error responses so the API returns consistent JSON instead of raw server crashes.

## Required environment variables

Copy `.env.example` to `.env` and fill in the values you actually need.

```bash
cp .env.example .env
```

The current phase uses these variables:

- `PORT` — the local server port, usually `5000`
- `NODE_ENV` — `development`, `test`, or `production`
- `FRONTEND_URL` — the allowed frontend origin for CORS
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — used to validate Supabase access tokens for the assistant endpoint
- `AI_PROVIDER=openai`, `AI_API_KEY`, `AI_MODEL` — used by the server-side educational assistant; never expose `AI_API_KEY` to the frontend
- `SUPABASE_SECRET_KEY` — optional and must remain server-only; the assistant uses the publishable key for user-token validation
- `YOUTUBE_API_KEY` — planned for later resource integration
- `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` — planned for later rate limiting

## Commands

```bash
npm install
npm run dev
npm run build
npm test
```

## Local testing

Open the app in a browser or use curl:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "MedEase AI backend",
    "environment": "development",
    "timestamp": "2025-01-01T12:00:00.000Z"
  },
  "message": "Backend is running correctly."
}
```

## Notes

The assistant only serves signed-in users and applies educational-only guidance to medical topics. User chat is kept in the current browser session; the backend does not persist conversation text.
