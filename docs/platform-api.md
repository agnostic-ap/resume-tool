# Resume Tool Platform API

This document describes the server-to-server API used by external AI platforms to generate JD-tailored resume drafts.

Default local base URL:

```text
http://127.0.0.1:8787
```

The machine-readable contract is available at:

```text
GET /api/v1/openapi.json
```

## Authentication

Send one of these headers on platform endpoints:

```http
x-resume-api-key: <client-key>
Authorization: Bearer <client-key>
```

Client keys are configured with `RESUME_PLATFORM_CLIENTS`:

```json
[
  {
    "id": "futurehire",
    "key": "dev-secret",
    "scopes": ["drafts:write", "requests:read"],
    "quotaPerDay": 1000,
    "rateLimitPerMinute": 60
  }
]
```

Available scopes:

- `drafts:write`: required for `POST /api/v1/resume-drafts`.
- `requests:read`: required for `GET /api/v1/platform/requests`.
- `requests:all`: allows reading all platform request logs. Without it, a client only sees its own logs.

The legacy `RESUME_PLATFORM_API_KEY` mode is still supported for local or single-client deployments. It grants `drafts:write`, `requests:read`, and `requests:all`.

## Generate A Resume Draft

```text
POST /api/v1/resume-drafts
```

Compatibility aliases:

```text
POST /api/v1/platform/resume-drafts
POST /api/platform/resume-drafts
```

Required request fields:

- `workHistory`: at least one work item with `company` and `title`.
- `jobDescription.title`: target role title.

Common optional fields:

- `requestId`: caller-provided id. Use it for idempotent persisted drafts.
- `userId`: external user id for logs and reconciliation.
- `persist`: when `true`, the draft is saved as a resume document.
- `locale`: `zh-CN` or `en-US`.
- `templateId`: one of `classic`, `modern`, `sidebar`, `compact`, `executive`, `creative`, `academic`, `technical`, `product`, or `minimal`.
- `personal`, `education`, `skills`, `projects`, `growthEntries`: source profile data used by the generator.
- `jobDescription.company`, `location`, `description`, `requirements`, `keywords`: JD context used for matching and ordering.

Example:

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
      "summary": "AI product engineer focused on recruiting workflows."
    },
    "workHistory": [
      {
        "id": "exp-1",
        "company": "Acme AI",
        "title": "Product Engineer",
        "description": "Built LLM workflow APIs, JD matching, and resume generation services.",
        "achievements": ["Improved recruiter review speed by 38%"],
        "skills": ["TypeScript", "Node.js", "LLM"]
      }
    ],
    "skills": ["TypeScript", "Node.js", "LLM"],
    "jobDescription": {
      "company": "FutureHire",
      "title": "Senior Product Engineer",
      "description": "Build AI recruiting workflows and resume generation services.",
      "keywords": ["LLM", "TypeScript", "Node.js", "resume generation"]
    }
  }'
```

## Response

Successful responses return a resume-shaped draft:

```json
{
  "requestId": "jd-run-001",
  "userId": "user-42",
  "title": "FutureHire Senior Product Engineer Draft",
  "data": {},
  "config": {},
  "match": {
    "score": 88,
    "keywords": ["LLM", "TypeScript"],
    "matchedKeywords": ["LLM", "TypeScript"],
    "selectedExperienceIds": ["exp-1"],
    "selectedExperienceIndexes": [0]
  },
  "generation": {
    "strategy": "rule-based-jd-tailoring-v1",
    "generatedAt": "2026-06-17T00:00:00.000Z",
    "persisted": true,
    "documentId": "resume-abc123",
    "idempotent": false
  }
}
```

Status codes:

- `200`: draft generated without persistence, or a persisted request was replayed idempotently.
- `201`: draft generated and persisted as a resume document.

When `persist` is `false` or omitted, `generation.persisted` is `false` and `generation.documentId` is absent.

## Idempotency

Use a stable `requestId` whenever `persist=true`.

If the same `requestId` is sent again with `persist=true`, the API returns the original `generation.documentId`, sets `generation.idempotent` to `true`, and uses status `200`. This prevents duplicate resume documents when an upstream platform retries after a timeout.

## Errors

Error responses use this shape:

```json
{
  "error": "Validation failed",
  "issues": [
    { "path": "workHistory", "message": "Array must contain at least 1 element(s)" }
  ]
}
```

Common errors:

- `400 Validation failed`: required fields are missing or have invalid values.
- `401 Platform API key is required`: missing or invalid key.
- `403 Platform API key is missing scope: drafts:write`: key is valid but lacks the required scope.
- `429 Platform API daily quota exceeded`: the client exceeded `quotaPerDay`.
- `429 Platform API rate limit exceeded`: the client exceeded `rateLimitPerMinute`.

## Request Logs

```text
GET /api/v1/platform/requests
```

Requires `requests:read`.

The response is an array of request log entries with:

- `id`, `requestId`, `userId`, `clientId`.
- `documentId` when a draft was persisted.
- `matchScore`, `persisted`, `status`, `route`, `latencyMs`.
- `error` when a failed request was recorded.
- `generatedAt`, `createdAt`, `replayedAt`, and `replayCount`.

Clients without `requests:all` only receive their own entries. Operators can also inspect redacted platform client summaries through `GET /api/admin/platform-clients` with a super admin token.
