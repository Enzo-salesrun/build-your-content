// Shared Claude (Anthropic) utility for all Edge Functions
// Import: import { claudeChat, claudeJSON } from '../_shared/claude.ts'

const CLAUDE_MODEL = 'claude-opus-4-5-20251101'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeOptions {
  temperature?: number
  maxTokens?: number
}

export interface ClaudeResponse {
  content: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Call Claude API with Opus 4.5
 * Centralized function to avoid duplication across Edge Functions
 */
export async function claudeChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  options: ClaudeOptions = {}
): Promise<ClaudeResponse> {
  const { temperature = 0.7, maxTokens = 4000 } = options

  console.log(`[claudeChat] Calling Claude Opus 4.5 with ${messages.length} messages, maxTokens: ${maxTokens}`)

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    temperature,
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`[claudeChat] API error ${response.status}:`, errorBody)
    throw new Error(`Claude API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''

  console.log(`[claudeChat] Success - input: ${data.usage?.input_tokens || 'N/A'}, output: ${data.usage?.output_tokens || 'N/A'} tokens`)

  return {
    content,
    usage: data.usage,
  }
}

/**
 * JSON response call - parses response as JSON
 * Claude doesn't have a native JSON mode, so we parse the response
 */
export async function claudeJSON<T>(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 8000
): Promise<T> {
  // Add JSON instruction to system prompt
  const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: Tu DOIS répondre UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après. Pas de markdown, pas de \`\`\`json, juste le JSON pur.`

  const result = await claudeChat(apiKey, [
    { role: 'user', content: userMessage }
  ], jsonSystemPrompt, {
    temperature: 0,
    maxTokens,
  })

  try {
    // Try to extract JSON from potential markdown code blocks
    let jsonContent = result.content.trim()
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7)
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3)
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3)
    }
    jsonContent = jsonContent.trim()

    return JSON.parse(jsonContent) as T
  } catch (e) {
    console.error('[claudeJSON] Failed to parse JSON:', result.content)
    throw new Error('Failed to parse Claude JSON response')
  }
}
