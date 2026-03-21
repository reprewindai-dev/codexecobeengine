import Redis from 'ioredis'
import { env } from '../config/env'

function isRedisDisabledValue(url: string): boolean {
  const normalized = url.trim().replace(/^['"]|['"]$/g, '').toLowerCase()
  return ['disabled', 'off', 'none', 'false', '0'].includes(normalized)
}

function normalizeRedisUrl(url: string): string {
  const trimmed = url.trim()

  if (trimmed.startsWith('//')) {
    return `rediss:${trimmed}`
  }

  if (!/^rediss?:\/\//i.test(trimmed)) {
    return `rediss://${trimmed.replace(/^\/+/, '')}`
  }

  return trimmed
}

function createDisabledRedisClient() {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'ping') {
          return async () => 'PONG'
        }

        if (prop === 'quit' || prop === 'disconnect') {
          return async () => undefined
        }

        if (prop === 'on' || prop === 'once') {
          return () => undefined
        }

        return async () => null
      },
    }
  ) as Redis
}

export const redisEnabled = !isRedisDisabledValue(env.REDIS_URL)

export const redis = !redisEnabled
  ? createDisabledRedisClient()
  : new Redis(normalizeRedisUrl(env.REDIS_URL), {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000)
      },
    })

if (redisEnabled) {
  redis.on('error', (err) => {
    console.error('Redis error:', err)
  })

  redis.on('connect', () => {
    console.log('Redis connected')
  })
}
