import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

const ATTACHMENT_ROUTE = /^\/api\/jira-attachment\/(content|thumbnail)\/([^/]+)\/([^/?]+)/
const ATTACHMENT_ID = /^[A-Za-z0-9_-]{1,128}$/

/**
 * Jira Cloud attachment downloads 303 to a media host. Browsers hide that redirect,
 * so localhost fetches this same-origin route and Node follows it.
 */
function jiraAttachmentDevProxy(): Plugin {
  return {
    name: 'jira-attachment-dev-proxy',
    configureServer(server) {
      attachJiraAttachmentProxy(server)
    },
    configurePreviewServer(server) {
      attachJiraAttachmentProxy(server)
    },
  }
}

function attachJiraAttachmentProxy(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use((req, res, next) => {
    void handleJiraAttachmentRequest(req, res)
      .then((handled) => {
        if (!handled) next()
      })
      .catch(() => {
        if (!res.headersSent) {
          res.statusCode = 502
          res.end('Failed to download Jira attachment')
        }
      })
  })
}

async function handleJiraAttachmentRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathOnly = (req.url ?? '').split('?')[0] ?? ''
  const match = ATTACHMENT_ROUTE.exec(pathOnly)
  if (!match) return false

  const variant = match[1]
  const cloudId = decodeURIComponent(match[2] ?? '')
  const attachmentId = decodeURIComponent(match[3] ?? '')
  if (variant !== 'content' && variant !== 'thumbnail') return false
  if (!ATTACHMENT_ID.test(cloudId) || !ATTACHMENT_ID.test(attachmentId)) {
    res.statusCode = 400
    res.end('Invalid attachment path')
    return true
  }

  const authorization = req.headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    res.statusCode = 401
    res.end('Missing Authorization')
    return true
  }

  const upstream = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/attachment/${variant}/${attachmentId}`
  const file = await fetchJiraBinary(upstream, authorization)
  if (!file.ok) {
    res.statusCode = file.status
    res.end('Jira attachment download failed')
    return true
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  res.statusCode = 200
  res.setHeader('Content-Type', file.headers.get('content-type') ?? 'application/octet-stream')
  const disposition = file.headers.get('content-disposition')
  if (disposition) res.setHeader('Content-Disposition', disposition)
  res.setHeader('Content-Length', buffer.length)
  res.end(buffer)
  return true
}

async function fetchJiraBinary(url: string, authorization: string): Promise<Response> {
  const first = await fetch(url, {
    headers: { Authorization: authorization, Accept: '*/*' },
    redirect: 'manual',
  })
  if (first.status < 300 || first.status >= 400) return first

  const location = first.headers.get('location')
  await first.body?.cancel()
  if (!location) return first

  const resolved = new URL(location, url)
  if (resolved.protocol !== 'https:') {
    throw new Error('Unexpected attachment redirect')
  }
  return fetch(resolved, { headers: { Accept: '*/*' }, redirect: 'follow' })
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Same-origin proxies for Atlassian (localhost dev/preview).
 * - auth token exchange (CORS)
 * - accessible-resources & Jira API (ad blockers often block `/oauth/token/` in the URL)
 */
const atlassianDevProxy = {
  '/api/atlassian': {
    target: 'https://auth.atlassian.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/api\/atlassian/, ''),
  },
  '/api/jira-cloud': {
    target: 'https://api.atlassian.com',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => {
      if (path.startsWith('/api/jira-cloud/accessible-resources')) {
        return '/oauth/token/accessible-resources';
      }
      return path.replace(/^\/api\/jira-cloud/, '');
    },
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [jiraAttachmentDevProxy(), react(), TanStackRouterVite()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    proxy: atlassianDevProxy,
  },
  preview: {
    proxy: atlassianDevProxy,
  },
})
