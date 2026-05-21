import { access, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoConfig = JSON.parse(await readFile(join(root, 'repo.config.json'), 'utf8'))

const requiredRootFiles = [
  'repo.config.json',
  'config/runtime.json',
  'config/shared.env.example',
  'scripts/sync-config.mjs',
]

const requiredRepoFiles = {
  'c-front': [
    'package.json',
    'repository.json',
    'config/runtime.json',
    'config/shared.env.example',
    'config/sync-meta.json',
    'src/App.vue',
  ],
  'admin-front': [
    'package.json',
    'repository.json',
    'config/runtime.json',
    'config/shared.env.example',
    'config/sync-meta.json',
    'src/App.tsx',
  ],
  'backend-api': [
    'package.json',
    'repository.json',
    'config/runtime.json',
    'config/shared.env.example',
    'config/sync-meta.json',
    'src/app.ts',
    'sql/001_initial_schema.sql',
    'deploy/Dockerfile',
    'deploy/docker-compose.yml',
  ],
}

await Promise.all(requiredRootFiles.map(assertFile))

if (repoConfig.repositories.length !== 3) {
  throw new Error(`expected 3 child repositories, got ${repoConfig.repositories.length}`)
}

for (const repo of repoConfig.repositories) {
  const files = requiredRepoFiles[repo.id]
  if (!files) throw new Error(`unknown repository id: ${repo.id}`)
  for (const file of files) {
    await assertFile(join(repo.path, file))
  }
  await assertRepositoryMetadata(repo)
  await assertSyncedConfig(repo)
}

console.log('workspace structure ok')

async function assertFile(path) {
  try {
    await access(join(root, path))
  } catch {
    throw new Error(`missing required file: ${path}`)
  }
}

async function assertRepositoryMetadata(repo) {
  const repository = await readJson(join(repo.path, 'repository.json'))
  const pkg = await readJson(join(repo.path, 'package.json'))
  if (repository.id !== repo.id) {
    throw new Error(`${repo.path}/repository.json id mismatch: expected ${repo.id}, got ${repository.id}`)
  }
  if (repository.name !== repo.name) {
    throw new Error(`${repo.path}/repository.json name mismatch: expected ${repo.name}, got ${repository.name}`)
  }
  if (pkg.name !== repo.name) {
    throw new Error(`${repo.path}/package.json name mismatch: expected ${repo.name}, got ${pkg.name}`)
  }
}

async function assertSyncedConfig(repo) {
  for (const file of repoConfig.configFiles) {
    const rootContent = await readFile(join(root, repoConfig.sharedConfigDir, file), 'utf8')
    const repoContent = await readFile(join(root, repo.path, 'config', file), 'utf8')
    if (rootContent !== repoContent) {
      throw new Error(`${repo.path}/config/${file} is out of sync with ${repoConfig.sharedConfigDir}/${file}`)
    }
  }
  const meta = await readJson(join(repo.path, 'config/sync-meta.json'))
  if (meta.repositoryId !== repo.id || meta.repositoryName !== repo.name) {
    throw new Error(`${repo.path}/config/sync-meta.json repository metadata is stale`)
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'))
}
