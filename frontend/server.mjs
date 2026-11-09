// Tiny static server for the built app. It also serves /config.js from the
// API_BASE_URL environment variable so the backend URL can change without a rebuild.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const root = resolve('dist')
const port = Number(process.env.PORT ?? 3000)
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8080'
const configJs = `window.APP_CONFIG = ${JSON.stringify({ apiBaseUrl })};\n`

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

async function resolveFile(pathname) {
  let file
  try {
    file = resolve(join(root, decodeURIComponent(pathname)))
  } catch {
    return null
  }
  if (file !== root && !file.startsWith(root + sep)) return null
  try {
    const info = await stat(file)
    return info.isDirectory() ? join(file, 'index.html') : file
  } catch {
    return join(root, 'index.html')
  }
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (pathname === '/config.js') {
    res.writeHead(200, { 'Content-Type': contentTypes['.js'], 'Cache-Control': 'no-store' })
    res.end(configJs)
    return
  }
  const file = await resolveFile(pathname)
  if (!file) {
    res.writeHead(400).end('Bad request')
    return
  }
  try {
    const body = await readFile(file)
    const cache = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
    res.writeHead(200, { 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': cache })
    res.end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Frontend running at http://localhost:${port} (API: ${apiBaseUrl})`)
})
