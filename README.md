# Resume Tool Workspace

This root repository coordinates four code repositories:

- `code/front`: C-side resume studio frontend.
- `code/admin`: internal management frontend built with Ant Design.
- `code/backend`: backend API service, SQL, and deployment assets.
- root workspace: shared configuration, scripts, design references, and cross-repo TODOs.

## Shared Config

Use Node.js `20.19.0` or newer for all child repositories. The workspace pins the recommended local version in `.nvmrc`.

Root-level config lives in `config/`. Run the sync script after changing shared config:

```bash
node scripts/sync-config.mjs
```

The script copies shared files into each child repository under its local `config/` directory.

## Repository Map

Repository metadata lives in `repo.config.json`. Keep paths stable so automation can discover each child repository without guessing.
