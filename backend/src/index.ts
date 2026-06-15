import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { prisma } from './config/database.js'
import { redis } from './config/redis.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import { startLogSyncScheduler } from './workers/logSync.worker.js'

const app = express()

// Security headers 
app.use(helmet())

// CORS 
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`))
      }
    },
    credentials: true, // Needed for HttpOnly cookies
  })
)

// Body parsing 
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Health check 
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes 
app.use('/api', routes)

// 404 handler 
app.use(notFoundHandler)

// Global error handler 
app.use(errorHandler)

// Start 
async function start() {
  try {
    // Connect Redis
    if (redis.status === 'wait') {
      await redis.connect()
    }

    // Verify DB connection
    await prisma.$connect()
    console.log('✅  Database connected')

    app.listen(env.PORT, () => {
      console.log(`Noori API running on http://localhost:${env.PORT}`)
      console.log(`Environment: ${env.NODE_ENV}`)
    })

    // Start BullMQ log sync scheduler
    await startLogSyncScheduler()
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

// Graceful shutdown 
process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await prisma.$disconnect()
  await redis.quit()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  await redis.quit()
  process.exit(0)
})

start()
