import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { requireSupabaseUser } from '../middleware/requireSupabaseUser.js'

const router = Router()

const chatSchema = z.object({
  mode: z.enum(['tutor', 'problem-solving']).default('tutor'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000),
  })).min(1).max(20),
  context: z.string().trim().max(1000).optional(),
}).refine((body) => body.messages.reduce((total, message) => total + message.content.length, 0) <= 12_000, {
  message: 'Keep the recent conversation under 12,000 characters.',
  path: ['messages'],
}).refine((body) => body.messages.at(-1)?.role === 'user', {
  message: 'The last message must be a user question.',
  path: ['messages'],
})
type ChatRequest = z.infer<typeof chatSchema>

declare global {
  namespace Express {
    interface Locals {
      chatRequest?: ChatRequest
    }
  }
}

const systemPrompts = {
  tutor: [
    'You are MedSimple AI, an educational tutor.',
    'Explain concepts clearly at the learner’s level, check assumptions, and state uncertainty when evidence is incomplete.',
    'For medical and physiology topics, provide educational information only; do not diagnose, prescribe, or replace a qualified clinician.',
    'Do not claim to be a clinician or provide fabricated citations.',
  ].join(' '),
  'problem-solving': [
    'You are MedSimple AI, a step-by-step educational problem-solving coach.',
    'Start by identifying the concept and useful evidence, then guide the learner through reasoning before giving a concise answer.',
    'Explain why plausible alternatives are wrong when useful, and invite a follow-up question.',
    'For medical topics, provide educational information only and clearly state uncertainty.',
  ].join(' '),
}

const validateChatBody: RequestHandler = (req, res, next) => {
  const parsed = chatSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CHAT_REQUEST',
        message: parsed.error.issues[0]?.message ?? 'The chat request is invalid.',
      },
    })
    return
  }
  res.locals.chatRequest = parsed.data
  next()
}

router.post('/chat', validateChatBody, requireSupabaseUser, async (_req, res) => {
  const parsed = res.locals.chatRequest
  if (!parsed) {
    res.status(500).json({
      success: false,
      error: { code: 'INVALID_CHAT_STATE', message: 'The chat request could not be processed.' },
    })
    return
  }
  if (!env.AI_API_KEY || !env.AI_MODEL || env.AI_PROVIDER?.toLowerCase() !== 'openai') {
    res.status(503).json({
      success: false,
      error: {
        code: 'AI_SERVICE_NOT_CONFIGURED',
        message: 'The configured AI provider is unavailable. Please try again later.',
      },
    })
    return
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompts[parsed.mode] },
    ...(parsed.context ? [{ role: 'system' as const, content: `Learning context: ${parsed.context}` }] : []),
    ...parsed.messages,
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      console.error(`AI provider returned HTTP ${response.status}.`)
      res.status(response.status === 429 ? 503 : 502).json({
        success: false,
        error: {
          code: response.status === 429 ? 'AI_SERVICE_BUSY' : 'AI_PROVIDER_ERROR',
          message: response.status === 429
            ? 'The AI tutor is busy. Please wait a moment and retry.'
            : 'The AI tutor could not answer right now. Please retry.',
        },
      })
      return
    }

    const result = await response.json() as {
      choices?: { message?: { content?: unknown } }[]
    }
    const answer = result.choices?.[0]?.message?.content
    if (typeof answer !== 'string' || !answer.trim()) {
      res.status(502).json({
        success: false,
        error: { code: 'EMPTY_AI_RESPONSE', message: 'The AI tutor returned an empty response. Please retry.' },
      })
      return
    }

    res.status(200).json({ success: true, data: { answer: answer.trim() } })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      res.status(504).json({
        success: false,
        error: { code: 'AI_REQUEST_TIMEOUT', message: 'The AI tutor took too long to respond. Please retry.' },
      })
      return
    }
    throw error
  }
})

export default router
