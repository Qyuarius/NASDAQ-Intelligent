import { spawn } from 'node:child_process'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  publicDir: 'public',
  plugins: [
    react(),
    {
      name: 'pipeline-refresh-api',
      configureServer(server) {
        server.middlewares.use('/api/refresh', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          const backendDir = path.resolve(__dirname, '../backend')
          const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
          const child = spawn(pythonCmd, ['run_pipeline.py'], {
            cwd: backendDir,
            env: process.env,
            shell: false,
          })

          let stdout = ''
          let stderr = ''

          child.stdout.on('data', (chunk) => {
            stdout += chunk.toString()
          })

          child.stderr.on('data', (chunk) => {
            stderr += chunk.toString()
          })

          child.on('error', (error) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: `Failed to start pipeline: ${error.message}`,
            }))
          })

          child.on('close', (code) => {
            res.setHeader('Content-Type', 'application/json')

            if (code === 0) {
              res.end(JSON.stringify({
                ok: true,
                message: 'Pipeline completed successfully',
                output: stdout,
              }))
              return
            }

            res.statusCode = 500
            res.end(JSON.stringify({
              error: 'Pipeline failed',
              output: stdout,
              details: stderr,
            }))
          })
        })
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
