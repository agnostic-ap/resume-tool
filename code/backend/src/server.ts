import { pathToFileURL } from 'node:url'
import { buildApp } from './app.js'
import { createStore } from './store.js'

export async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787)
  const host = process.env.HOST ?? '127.0.0.1'

  const app = await buildApp(createStore())

  try {
    await app.listen({ host, port })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startServer()
}
