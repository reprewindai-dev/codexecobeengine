import express from 'express'

import { prisma, resilientPrisma } from './lib/db'
import { redis } from './lib/redis'
import internalRoutes from './routes/internal'
import databaseHealthRoutes from './routes/database-health'

function rawBodySaver(req: express.Request, _res: express.Response, buf: Buffer) {
  if (buf?.length) {
    const rawReq = req as { rawBody?: string }
    rawReq.rawBody = buf.toString('utf8')
  }
}

function attachHealthRoutes(app: express.Express) {
  async function readinessHandler(_req: express.Request, res: express.Response) {
    try {
      // Use resilient database health check
      const dbHealthy = await resilientPrisma.healthCheck()

      let redisOk = true
      try {
        await redis.ping()
      } catch {
        redisOk = false
      }

      const ok = dbHealthy && redisOk

      res.status(ok ? 200 : 503).json({
        status: ok ? 'healthy' : 'degraded',
        service: 'ecobe-engine',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: dbHealthy,
          redis: redisOk,
        },
      })
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'ecobe-engine',
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/ready', readinessHandler)
}

function attachFallbackHandlers(app: express.Express) {
  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.path}` })
  })

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Engine server error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })
}

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.use(express.json({ limit: '1mb', verify: rawBodySaver }))
  app.use(express.urlencoded({ extended: true, limit: '1mb', verify: rawBodySaver }))

  attachHealthRoutes(app)
  app.use('/internal/v1', internalRoutes)
  app.use('/database', databaseHealthRoutes)
  attachFallbackHandlers(app)

  return app
}

export default createApp
