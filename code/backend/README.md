# Resume Tool Backend

Standalone backend API repository for Resume Studio.

Stack:

- Fastify for the HTTP server and plugin ecosystem
- TypeScript for API-layer type safety
- Zod for request body validation
- JSON file storage for the first local-first version

Repository assets:

- `src/`: backend API implementation
- `test/`: backend API and store tests
- `sql/`: target database schema and migration notes
- `deploy/`: Docker and compose deployment files
- `config/`: shared config synced from the root workspace

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
- `CORS_ORIGIN`: comma-separated allowed origins. Defaults to local dev origins only; with `NODE_ENV=production` and no `CORS_ORIGIN`, cross-origin requests are disabled.
- `RESUME_ADMIN_USERS`: optional JSON array for admin console access. Each entry supports `email`, `token` or `tokenHash` (sha256 hex of the token, preferred so plaintext secrets stay out of config), `role` (`super_admin`, `ops_admin`, `viewer`), and optional `status` (`enabled`, `locked`).
- `RESUME_ADMIN_TOKEN`: optional legacy single super admin token. Ignored when `RESUME_ADMIN_USERS` is set.
- `RESUME_PLATFORM_API_KEY`: optional legacy server-to-server key. When set, platform APIs accept `x-resume-api-key` or `Authorization: Bearer ...` and grant `drafts:write`, `requests:read`, and `requests:all`.
- `RESUME_PLATFORM_CLIENTS`: optional JSON array for per-client API access. When set, it replaces the legacy single-key mode. Each entry supports `key` or `keyHash` (sha256 hex, preferred).

Auth notes: secrets are compared in constant time, and repeated failed attempts from one IP are throttled (HTTP 429, 10 failures per minute). Generate a hash with `node -e "console.log(require('crypto').createHash('sha256').update('the-secret').digest('hex'))"`.
- `RESUME_LLM_API_KEY`: optional. When set, resume drafts are rewritten by a real LLM (summary + experience bullets) via an OpenAI-compatible chat completions API. When unset, generation falls back to the deterministic rule-based engine. Either way the response carries a structured field-level diff.
- `RESUME_LLM_BASE_URL`: OpenAI-compatible base URL, defaults to `https://api.openai.com/v1`.
- `RESUME_LLM_MODEL`: model id, defaults to `gpt-4o-mini`.
- `RESUME_LLM_TIMEOUT_MS`: LLM request timeout in ms, defaults to `20000`. On timeout or any error the request falls back to rule-based generation.

Admin config example:

```json
[
  { "email": "owner@example.com", "token": "owner-secret", "role": "super_admin" },
  { "email": "audit@example.com", "token": "audit-secret", "role": "viewer" }
]
```

Platform client config example:

```json
[
  {
    "id": "futurehire",
    "key": "dev-secret",
    "scopes": ["drafts:write", "requests:read"],
    "quotaPerDay": 1000,
    "rateLimitPerMinute": 60,
    "pricePerDraft": 0.5,
    "currency": "USD"
  },
  {
    "id": "ops",
    "key": "ops-secret",
    "scopes": ["requests:read", "requests:all"]
  }
]
```

## API

```text
GET    /health
GET    /api/state

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
POST   /api/assistant/resume-drafts

GET    /api/v1/openapi.json
GET    /api/v1/platform/requests
GET    /api/v1/platform/usage
GET    /api/admin/session
GET    /api/admin/state
GET    /api/admin/platform-clients
GET    /api/admin/platform-usage
POST   /api/v1/resume-drafts
POST   /api/v1/platform/resume-drafts
POST   /api/platform/resume-drafts
```

Example:

```bash
curl -s http://127.0.0.1:8787/api/resumes
curl -s -X POST http://127.0.0.1:8787/api/applications \
  -H 'content-type: application/json' \
  -d '{"company":"Vercel","role":"Frontend Engineer","stage":"screen","match":86}'
```

Platform generation example using the canonical external route:

```bash
curl -s -X POST http://127.0.0.1:8787/api/v1/resume-drafts \
  -H 'content-type: application/json' \
  -H 'x-resume-api-key: dev-secret' \
  -d '{
    "requestId": "jd-run-001",
    "userId": "user-42",
    "persist": true,
    "locale": "zh-CN",
    "templateId": "modern",
    "personal": {
      "name": "Lin Chen",
      "email": "lin@example.com",
      "summary": "AI 产品工程师，关注招聘自动化与业务交付。"
    },
    "workHistory": [
      {
        "company": "Acme AI",
        "title": "Product Engineer",
        "description": "负责 LLM 工作流、JD 匹配、简历生成 API。",
        "achievements": ["将招聘筛选效率提升 38%"],
        "skills": ["TypeScript", "Node.js", "LLM", "API design"]
      }
    ],
    "skills": ["TypeScript", "Node.js", "LLM"],
    "jobDescription": {
      "company": "FutureHire",
      "title": "高级产品工程师",
      "description": "建设 AI 招聘产品、实时 JD 匹配和简历生成服务。",
      "keywords": ["LLM", "TypeScript", "Node.js", "简历生成"]
    }
  }'
```

`POST /api/v1/resume-drafts` is intended for another AI platform to call after it has analyzed a user's full work history and a target JD. The response returns a generated resume-shaped draft, match metadata, selected experience indexes, and generation metadata. Set `persist: true` to save the draft as a resume document and receive `generation.documentId`.

Developer-facing integration details live in `../../docs/platform-api.md`. The same contract is available from the running backend at `GET /api/v1/openapi.json`.

Platform product behavior:

- `GET /api/v1/openapi.json` returns the public OpenAPI contract and curl/idempotency notes.
- `drafts:write` scope is required for draft generation routes.
- `requests:read` scope is required for `GET /api/v1/platform/requests`.
- Clients without `requests:all` only see their own request logs.
- `GET /api/admin/platform-clients` returns redacted client metadata for the admin console, including scopes, quota, rate limit, request counts, and last request time. It never returns API key material.
- `GET /api/admin/platform-usage` (super admin) and `GET /api/v1/platform/usage` (client, `requests:read`) return metered usage and billing per client: billable (non-failed) requests, failures, today's requests, quota utilization, avg/p95 latency, and `estimatedCost = billableRequests × pricePerDraft`. This is the B2B metering/reconciliation surface for the platform second curve.
- `quotaPerDay` returns `429 Platform API daily quota exceeded` once the client exceeds the daily request count.
- `rateLimitPerMinute` returns `429 Platform API rate limit exceeded` for short bursts.
- Reusing `requestId` with `persist: true` returns the original `generation.documentId` and `generation.idempotent=true`.
- Request logs include `clientId`, `route`, `status`, `matchScore`, `latencyMs`, persistence metadata, and replay counters.

Compatibility aliases:

- `POST /api/v1/platform/resume-drafts`
- `POST /api/platform/resume-drafts`

## Tests

```bash
cd code/backend
npm test
npm run typecheck
npm run build
```
