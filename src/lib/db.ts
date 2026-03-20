import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import { withOptimize } from '@prisma/extension-optimize'
import { env } from '../config/env'

/**
 * Ensure Neon pooler URLs have pgbouncer=true for Prisma compatibility.
 * Neon's pooler uses PgBouncer under the hood; without this flag Prisma's
 * prepared-statement protocol conflicts with PgBouncer's transaction mode,
 * causing "Connection Closed" errors on idle connections.
 */
function ensureNeonPoolerParams(url: string): string {
  try {
    const parsed = new URL(url)
    
    // Always add pgbouncer=true for pooler URLs to prevent connection closure issues
    if (url.includes('pooler') || url.includes('pgbouncer')) {
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true')
      }
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '10') // Increased from 5
      }
      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '30') // Increased from 20
      }
      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '30')
      }
    }
    
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Retry database operations with exponential backoff
 */
async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Only retry on connection-related errors
      if (!isConnectionError(error) || attempt === maxRetries) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`Database connection failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Check if error is connection-related and should be retried
 */
function isConnectionError(error: any): boolean {
  const message = error?.message?.toLowerCase() || ''
  const code = error?.code
  
  return (
    message.includes('connection closed') ||
    message.includes('connection timeout') ||
    message.includes('connection refused') ||
    message.includes('connection terminated') ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED'
  )
}

/**
 * Prisma Client Factory — Accelerate + Optimize
 *
 * Extension chain order matters (Prisma docs):
 *   1. Optimize (query monitoring / insights)  — applied first
 *   2. Accelerate (connection pooling + cache)  — applied last (takes precedence)
 *
 * Runtime queries flow through Accelerate's global pool via prisma:// URL.
 * Migrations / introspection use DIRECT_DATABASE_URL via prisma.config.ts.
 */
const createPrismaClient = () => {
  const dbUrl = ensureNeonPoolerParams(env.DATABASE_URL)

  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

  // Build the extension chain: Optimize → Accelerate
  // Both are optional — the engine boots cleanly without either.
  let client: any = baseClient

  // 1. Optimize (query monitoring) — only when API key is present
  if (env.OPTIMIZE_API_KEY) {
    client = client.$extends(
      withOptimize({
        apiKey: env.OPTIMIZE_API_KEY,
      })
    )
  }

  // 2. Accelerate (connection pooling + global cache) — only when using prisma:// or prisma+postgres:// URL
  if (env.DATABASE_URL.startsWith('prisma://') || env.DATABASE_URL.startsWith('prisma+postgres://')) {
    client = client.$extends(withAccelerate())
  }

  return client
}

/**
 * Database health check
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

/**
 * Resilient database operations wrapper
 */
export const resilientPrisma = {
  // Wrap all common Prisma operations with retry logic
  async query<T>(operation: () => Promise<T>): Promise<T> {
    return withDatabaseRetry(operation)
  },
  
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return withDatabaseRetry(async () => {
      return await prisma.$transaction(callback)
    })
  },
  
  async healthCheck(): Promise<boolean> {
    return await checkDatabaseHealth()
  },
  
  // Expose the raw client for direct access when needed
  get raw() {
    return prisma
  }
}

type PrismaClientWithExtensions = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithExtensions | undefined
}

export const prisma: PrismaClientWithExtensions = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
