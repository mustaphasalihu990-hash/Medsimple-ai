import { supabase } from './supabase'

export type AssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantMode = 'tutor' | 'problem-solving'

export async function askAssistant(
  messages: AssistantMessage[],
  mode: AssistantMode,
  context?: string,
): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const accessToken = data.session?.access_token
  if (!accessToken) throw new Error('Your session has expired. Please sign in again.')

  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:5000'
  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/api/assistant/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: messages.slice(-20), mode, context }),
  })

  const result = await response.json() as {
    success?: boolean
    data?: { answer?: string }
    error?: { message?: string }
  }
  if (!response.ok || !result.success || typeof result.data?.answer !== 'string') {
    throw new Error(result.error?.message ?? 'The assistant could not respond. Please try again.')
  }
  return result.data.answer
}
