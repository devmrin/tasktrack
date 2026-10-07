import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

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
  plugins: [react(), TanStackRouterVite()],
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
