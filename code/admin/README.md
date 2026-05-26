# Resume Tool Admin

Super admin frontend for Resume Studio. This app is intended for the platform owner to manage global users, permissions, platform API calls, shared config, and deployment/data health.

Stack:

- React and Vite
- Ant Design for layout, navigation, tables, metrics, forms, and status displays
- Shared root configuration synced into `config/`

## Run

```bash
cd code/admin
npm install
npm run dev
```

Default URL: `http://127.0.0.1:5174`

## Current Scope

- Super admin dashboard backed by `GET /api/state`
- User, tenant, role, and API key overview
- Resume document management overview from backend resume documents
- Application pipeline monitoring from backend applications
- Platform API request log from backend platform requests, with client/route/status filters and expandable request details
- Redacted API client metadata from `GET /api/admin/platform-clients`, including scopes, quota, rate limit, usage, and last request time
- Shared config visibility
- Audit log view from backend activity events

Still intentionally pending:

- Super admin authentication and role enforcement
- API client/key create, rotate, revoke, and hash-backed storage flows
- Persistent audit log viewer backed by `audit_logs`
