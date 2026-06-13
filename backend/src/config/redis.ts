import IORedis from 'ioredis'
import { env } from './env.js'

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
})

redis.on('connect', () => console.log('✅  Redis connected'))
redis.on('error', (err) => console.error('❌  Redis error:', err.message))
