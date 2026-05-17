# Resume Tool Backend

Standalone local backend for Resume Studio.

Stack:

- Fastify for the HTTP server and plugin ecosystem
- TypeScript for API-layer type safety
- Zod for request body validation
- JSON file storage for the first local-first version

## Run

```bash
cd code/backend
npm install
npm run dev
```

Default URL: `http://127.0.0.1:8787`

Environment variables:

- `PORT`: server port, defaults to `8787`
- `HOST`: bind host, defaults to `127.0.0.1`
- `RESUME_BACKEND_DATA_DIR`: JSON data directory, defaults to `code/backend/.data`
- `CORS_ORIGIN`: allowed CORS origin, defaults to `*`

## API

```text
GET    /health
GET    /api/state
PUT    /api/state

GET    /api/resumes
POST   /api/resumes
GET    /api/resumes/:id
PUT    /api/resumes/:id
PATCH  /api/resumes/:id
DELETE /api/resumes/:id
POST   /api/resumes/:id/select
POST   /api/resumes/:id/duplicate
POST   /api/resumes/:id/career-update

GET    /api/applications
POST   /api/applications
PATCH  /api/applications/:id
DELETE /api/applications/:id

GET    /api/activity
POST   /api/assistant/suggestions
```

Example:

```bash
curl -s http://127.0.0.1:8787/api/resumes
curl -s -X POST http://127.0.0.1:8787/api/applications \
  -H 'content-type: application/json' \
  -d '{"company":"Vercel","role":"Frontend Engineer","stage":"screen","match":86}'
```

## Tests

```bash
cd code/backend
npm test
npm run typecheck
```
