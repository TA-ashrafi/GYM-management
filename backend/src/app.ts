import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes'
import { errorHandler } from './middleware/error.middleware'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

// Mount main router under /api
app.use('/api', routes)

// Global error handler
app.use(errorHandler)

export default app
