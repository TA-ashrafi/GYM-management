import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes'
import { errorHandler } from './middleware/error.middleware'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

// Root route handler
app.get('/', (req, res) => {
  res.json({
    message: '🚀 ALPHA FITNESS Backend API Server is running!',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  })
})

// Mount main router under /api
app.use('/api', routes)

// Global error handler
app.use(errorHandler)

export default app
