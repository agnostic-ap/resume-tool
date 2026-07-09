# Deployment

The backend persists all state in SQLite at `<RESUME_BACKEND_DATA_DIR>/resume.db`
(WAL mode, so `-wal` / `-shm` companion files live in the same directory).
Anything that should survive a container restart must keep that directory on a
volume.

## Local container run

```bash
cd code/backend/deploy
docker compose up --build
```

The compose file mounts the named volume `resume-api-data` over `/data` and
adds a `/health` healthcheck. The container runs as the non-root `node` user;
the image pre-creates `/data` with matching ownership, which named volumes
inherit. If you switch to a bind mount instead, make the host directory
writable by uid 1000.

## Minimal production checklist

1. Copy `env.example` and fill in real values. At minimum:
   - `CORS_ORIGIN`: your frontend origin(s). Leaving it unset in production
     rejects all cross-origin requests by design.
   - `RESUME_AUTH_MODE=multi-user` to require login on data routes.
   - `RESUME_ADMIN_USERS` with `tokenHash` entries (sha256 hex — see
     env.example for the generator one-liner). Avoid plaintext tokens.
   - `RESUME_PLATFORM_CLIENTS` with `keyHash` entries if external platforms
     call the draft API; otherwise leave platform vars unset.
2. Mount a persistent volume over `RESUME_BACKEND_DATA_DIR` (default `/data`).
3. Deploy and verify:

```bash
curl -fsS http://<host>:8787/health
# expect {"ok":true,...,"dbPath":"/data/resume.db"}
```

4. Back up by snapshotting the data volume. To restore, place the `resume.db`
   file (plus `-wal`/`-shm` if present) back into the data directory before
   starting the container. A legacy `resume-state.json` found in the data
   directory is imported into SQLite on first boot and renamed to
   `resume-state.json.migrated`.

The Postgres-flavored production schema draft lives in `../sql/` for a future
managed-database migration; the SQLite schema actually applied at startup is
`../sql/sqlite/`.
