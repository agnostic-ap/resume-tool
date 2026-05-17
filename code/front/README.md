# Resume Studio Frontend

Vue 3 + TypeScript frontend for the resume workspace.

## Run

```bash
npm install
npm run dev
```

By default the app tries to sync with the local backend at `http://127.0.0.1:8787`. If the backend is not running, it falls back to localStorage so the editor still works offline.

To point at another backend:

```bash
VITE_RESUME_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

## Build

```bash
npm run build
```
