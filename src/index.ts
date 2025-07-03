import { AutoRouter } from 'itty-router'
import { withDatabase } from './helper'
import index from './routes/index'

export const router = AutoRouter()

router
  .get('/', withDatabase, index)

export default router