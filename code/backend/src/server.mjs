import { createServer } from 'node:http'
import { createStore, httpError } from './store.mjs'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const store = createStore()

const server = createServer(async (req, res) => {
  const startedAt = Date.now()
  try {
    await handleRequest(req, res)
  } catch (error) {
    sendError(res, error)
  } finally {
    const method = req.method ?? 'GET'
    const url = req.url ?? '/'
    console.info(`${method} ${url} ${res.statusCode} ${Date.now() - startedAt}ms`)
  }
})

async function handleRequest(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return send(res, 204)

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${HOST}:${PORT}`}`)
  const path = trimSlashes(url.pathname)
  const segments = path ? path.split('/') : []

  if (req.method === 'GET' && path === 'health') {
    return sendJson(res, 200, { ok: true, service: 'resume-tool-backend', dbPath: store.dbPath })
  }

  if (segments[0] !== 'api') throw httpError(404, 'Route not found')

  if (req.method === 'GET' && path === 'api/state') {
    return sendJson(res, 200, await store.readState())
  }

  if (req.method === 'PUT' && path === 'api/state') {
    return sendJson(res, 200, await store.replaceState(await readJson(req)))
  }

  if (segments[1] === 'resumes') {
    return handleResumes(req, res, segments)
  }

  if (segments[1] === 'applications') {
    return handleApplications(req, res, segments)
  }

  if (segments[1] === 'activity' && req.method === 'GET' && segments.length === 2) {
    return sendJson(res, 200, await store.listActivity())
  }

  if (segments[1] === 'assistant' && segments[2] === 'suggestions' && req.method === 'POST' && segments.length === 3) {
    return sendJson(res, 201, await store.createAssistantSuggestion(await readJson(req)))
  }

  throw httpError(404, 'Route not found')
}

async function handleResumes(req, res, segments) {
  const id = decodeURIComponent(segments[2] ?? '')

  if (segments.length === 2 && req.method === 'GET') {
    return sendJson(res, 200, await store.listDocuments())
  }

  if (segments.length === 2 && req.method === 'POST') {
    return sendJson(res, 201, await store.createDocument(await readJson(req)))
  }

  if (!id) throw httpError(404, 'Resume not found')

  if (segments.length === 3 && req.method === 'GET') {
    return sendJson(res, 200, await store.getDocument(id))
  }

  if (segments.length === 3 && (req.method === 'PUT' || req.method === 'PATCH')) {
    return sendJson(res, 200, await store.updateDocument(id, await readJson(req)))
  }

  if (segments.length === 3 && req.method === 'DELETE') {
    return sendJson(res, 200, await store.deleteDocument(id))
  }

  if (segments[3] === 'select' && segments.length === 4 && req.method === 'POST') {
    return sendJson(res, 200, await store.selectDocument(id))
  }

  if (segments[3] === 'duplicate' && segments.length === 4 && req.method === 'POST') {
    const body = await readJson(req)
    return sendJson(res, 201, await store.createDocument({ ...body, sourceId: id, blank: false }))
  }

  if (segments[3] === 'career-update' && segments.length === 4 && req.method === 'POST') {
    return sendJson(res, 200, await store.markCareerUpdated(id))
  }

  throw httpError(404, 'Route not found')
}

async function handleApplications(req, res, segments) {
  const id = decodeURIComponent(segments[2] ?? '')

  if (segments.length === 2 && req.method === 'GET') {
    return sendJson(res, 200, await store.listApplications())
  }

  if (segments.length === 2 && req.method === 'POST') {
    return sendJson(res, 201, await store.createApplication(await readJson(req)))
  }

  if (!id) throw httpError(404, 'Application not found')

  if (segments.length === 3 && (req.method === 'PUT' || req.method === 'PATCH')) {
    return sendJson(res, 200, await store.updateApplication(id, await readJson(req)))
  }

  if (segments.length === 3 && req.method === 'DELETE') {
    return sendJson(res, 200, await store.deleteApplication(id))
  }

  throw httpError(404, 'Route not found')
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw httpError(400, 'Invalid JSON body')
  }
}

function sendJson(res, status, payload) {
  return send(res, status, JSON.stringify(payload), { 'content-type': 'application/json; charset=utf-8' })
}

function sendError(res, error) {
  const status = Number(error.status ?? 500)
  const message = status >= 500 ? 'Internal server error' : error.message
  sendJson(res, status, { error: message })
}

function send(res, status, body = '', headers = {}) {
  res.writeHead(status, {
    ...headers,
    'cache-control': 'no-store',
  })
  res.end(body)
}

function setCorsHeaders(res) {
  res.setHeader('access-control-allow-origin', process.env.CORS_ORIGIN ?? '*')
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '')
}

server.listen(PORT, HOST, () => {
  console.info(`Resume backend listening on http://${HOST}:${PORT}`)
})
