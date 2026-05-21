# Deployment

Local container run:

```bash
cd code/backend/deploy
docker compose up --build
```

The current backend persists MVP data to a JSON file. The compose file mounts `/data` so local state survives container restarts.

For production, pair this service with the SQL schema in `../sql` and replace JSON-file storage with the database-backed store.
