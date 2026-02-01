// Shared OpenAI utility for all Edge Functions
// Import: import { openaiChat } from '../_shared/openai.ts'

const OPENAI_MODEL = 'gpt-5.2'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' | 'text' }
}

export interface OpenAIResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Call OpenAI Chat Completion API with GPT 5.2
 * Centralized function to avoid duplication across Edge Functions
 */
export async function openaiChat(
  apiKey: string,
  messages: ChatMessage[],
  options: OpenAIOptions = {}
): Promise<OpenAIResponse> {
  const { temperature = 0.7, maxTokens = 2000, responseFormat } = options

  console.log(`[openaiChat] Calling GPT 5.2 with ${messages.length} messages, maxTokens: ${maxTokens}`)

  const requestBody: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages,
    temperature,
    max_completion_tokens: maxTokens,
  }

  if (responseFormat) {
    requestBody.response_format = responseFormat
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[openaiChat] API error ${response.status}:`, errorBody)
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  console.log(`[openaiChat] Success - ${data.usage?.total_tokens || 'N/A'} tokens used`)

  return {
    content,
    usage: data.usage,
  }
}

/**
 * Simple classification call - returns just the category name
 */
export async function openaiClassify(
  apiKey: string,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const result = await openaiChat(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ], { temperature: 0, maxTokens: 50 })

  return result.content.trim().toLowerCase()
}

/**
 * JSON response call - parses response as JSON
 */
export async function openaiJSON<T>(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens: number = 4000
): Promise<T> {
  const result = await openaiChat(apiKey, messages, {
    temperature: 0,
    maxTokens,
    responseFormat: { type: 'json_object' },
  })

  try {
    return JSON.parse(result.content) as T
  } catch (e) {
    console.error('[openaiJSON] Failed to parse JSON:', result.content)
    throw new Error('Failed to parse OpenAI JSON response')
  }
}
