import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

export type AuthenticatedRequest = Request & {
  userId?: string
}

export async function requireSupabaseUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header('authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const apiKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_SECRET_KEY

  if (!env.SUPABASE_URL || !apiKey) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SUPABASE_AUTH_NOT_CONFIGURED',
        message: 'The backend Supabase URL and publishable key must be configured.',
      },
    })
    return
  }

  if (!accessToken) {
    res.status(401).json({
      success: false,
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to use this service.' },
    })
    return
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Your session is invalid or expired. Please sign in again.' },
      })
      return
    }

    const user = await response.json() as { id?: unknown }
    if (typeof user.id !== 'string') {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Supabase returned an invalid user session.' },
      })
      return
    }

    req.userId = user.id
    next()
  } catch (error) {
    next(error)
  }
}
