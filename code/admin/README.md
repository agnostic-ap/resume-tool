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

- Super admin dashboard
- User, tenant, role, and API key overview
- Resume document management overview
- Application pipeline monitoring
- Platform API request log
- Shared config visibility
