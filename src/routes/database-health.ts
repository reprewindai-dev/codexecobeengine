/**
 * Database Health Check Routes
 * 
 * Provides endpoints to monitor database connection status
 * and diagnose connection issues
 */

import { Router } from 'express'
import { resilientPrisma } from '../lib/db'

const router = Router()

/**
 * GET /database/health
 * Basic database health check
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await resilientPrisma.healthCheck()
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      })
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection failed'
      })
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /database/test
 * Test database with a simple query
 */
router.get('/test', async (req, res) => {
  try {
    const result = await resilientPrisma.query(async () => {
      return await resilientPrisma.raw.$queryRaw`SELECT 
        'database_test' as test,
        NOW() as timestamp,
        version() as version`
    })
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /database/pool-status
 * Check connection pool status (if available)
 */
router.get('/pool-status', async (req, res) => {
  try {
    // Test multiple concurrent connections to check pool health
    const concurrentQueries = Array.from({ length: 5 }, async (_, i) => {
      const start = Date.now()
      await resilientPrisma.query(async () => {
        return await resilientPrisma.raw.$queryRaw`SELECT ${i} as query_id, NOW() as timestamp`
      })
      return Date.now() - start
    })
    
    const results = await Promise.all(concurrentQueries)
    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      poolStatus: {
        concurrentQueries: results.length,
        averageResponseTime: `${avgTime.toFixed(2)}ms`,
        maxResponseTime: `${Math.max(...results)}ms`,
        minResponseTime: `${Math.min(...results)}ms`
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
