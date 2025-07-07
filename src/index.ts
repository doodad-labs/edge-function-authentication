import { AutoRouter, withContent, RequestHandler } from 'itty-router'
import { withDatabase } from './helper'

import home from './routes/home'
import serviceRegister from './routes/service/register'

export const router = AutoRouter()

router

  // Root endpoint
  .get('/', withDatabase, home)

  // Endpoint to register a service user
  .post('/service/register', withDatabase, withContent, serviceRegister as RequestHandler)

export default router
