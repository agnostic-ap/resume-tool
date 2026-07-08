# SQL

`001_initial_schema.sql` describes the target relational schema for moving the backend from local JSON-file storage to database-backed persistence. `002_auth.sql` adds account sessions for the multi-user backend path.

The SQLite runtime migrations live under `sql/sqlite/` and mirror the production schema shape with local SQLite storage types.
