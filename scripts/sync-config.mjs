import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoConfigPath = join(root, 'repo.config.json')
const repoConfig = JSON.parse(await readFile(repoConfigPath, 'utf8'))
const sharedConfigDir = join(root, repoConfig.sharedConfigDir)
const syncedAt = new Date().toISOString()

for (const repo of repoConfig.repositories) {
  const targetDir = join(root, repo.path, 'config')
  await mkdir(targetDir, { recursive: true })

  for (const file of repoConfig.configFiles) {
    await cp(join(sharedConfigDir, file), join(targetDir, file))
  }

  await writeFile(
    join(targetDir, 'sync-meta.json'),
    `${JSON.stringify({
      workspace: repoConfig.workspace,
      repositoryId: repo.id,
      repositoryName: repo.name,
      syncedFrom: repoConfig.sharedConfigDir,
      configFiles: repoConfig.configFiles,
      syncedAt,
    }, null, 2)}\n`,
    'utf8',
  )

  console.log(`synced ${repo.id} -> ${repo.path}/config`)
}
