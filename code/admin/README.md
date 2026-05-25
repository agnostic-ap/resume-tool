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
- Platform API request log from backend platform requests
- Shared config visibility

Still intentionally pending:

- Super admin authentication and role enforcement
- API client/key CRUD screens
- Dangerous action confirmation flows
- Persistent audit log viewer backed by `audit_logs`
