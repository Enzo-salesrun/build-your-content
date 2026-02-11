// Unified AI Service with Fallback and Error Tracking
// Primary: Claude Opus 4.6 | Fallback: GPT-5.2
// Import: import { aiService, AIServiceError } from '../_shared/ai-service.ts'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ============================================
// CONFIGURATION
// ============================================
const CLAUDE_MODEL = 'claude-opus-4-6'
const OPENAI_MODEL = 'gpt-5.2'
const OPENAI_MODEL_LIGHT = 'gpt-5-mini'  // For classifications (~20x cheaper)
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Pricing table for cost calculation (per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.2': { input: 5.00, output: 15.00 },
  'gpt-5-mini': { input: 0.25, output: 2.00 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'claude-opus-4-6': { input: 5.00, output: 25.00 },
}

function calculateCost(model: string, inputTokens: number, outputTokens: number) {
  const price = MODEL_PRICING[model] || { input: 0, output: 0 }
  return {
    inputCost: (inputTokens / 1_000_000) * price.input,
    outputCost: (outputTokens / 1_000_000) * price.output,
  }
}

// Error codes for tracking
export const AI_ERROR_CODES = {
  CLAUDE_API_ERROR: 'CLAUDE_API_ERROR',
  CLAUDE_TIMEOUT: 'CLAUDE_TIMEOUT',
  CLAUDE_RATE_LIMIT: 'CLAUDE_RATE_LIMIT',
  CLAUDE_OVERLOADED: 'CLAUDE_OVERLOADED',
  OPENAI_API_ERROR: 'OPENAI_API_ERROR',
  OPENAI_TIMEOUT: 'OPENAI_TIMEOUT',
  OPENAI_RATE_LIMIT: 'OPENAI_RATE_LIMIT',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  ALL_MODELS_FAILED: 'ALL_MODELS_FAILED',
  MISSING_API_KEY: 'MISSING_API_KEY',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES]

// ============================================
// TYPES
// ============================================
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIServiceOptions {
  temperature?: number
  maxTokens?: number
  functionName: string              // Required for error tracking
  userId?: string
  profileId?: string
  requestId?: string
  enableFallback?: boolean          // Default: true
  jsonMode?: boolean                // Default: false
}

export interface AIServiceResult<T = string> {
  data: T
  model: string
  fallbackUsed: boolean
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  latencyMs: number
}

export class AIServiceError extends Error {
  code: AIErrorCode
  userErrorRef?: string
  functionName: string
  model: string
  fallbackAttempted: boolean
  
  constructor(
    code: AIErrorCode,
    message: string,
    functionName: string,
    model: string,
    fallbackAttempted: boolean = false,
    userErrorRef?: string
  ) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.functionName = functionName
    this.model = model
    this.fallbackAttempted = fallbackAttempted
    this.userErrorRef = userErrorRef
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userErrorRef: this.userErrorRef,
      functionName: this.functionName,
      model: this.model,
      fallbackAttempted: this.fallbackAttempted,
    }
  }
}

// ============================================
// ERROR LOGGING
// ============================================
async function logError(
  errorCode: AIErrorCode,
  errorMessage: string,
  options: {
    functionName: string
    userId?: string
    profileId?: string
    requestId?: string
    primaryModel?: string
    fallbackModel?: string
    fallbackUsed?: boolean
    fallbackSuccess?: boolean
    inputTokens?: number
    outputTokens?: number
    latencyMs?: number
    errorStack?: string
    metadata?: Record<string, unknown>
  }
): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[ai-service] Cannot log error: missing Supabase credentials')
      return null
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data, error } = await supabase
      .from('ai_errors')
      .insert({
        error_code: errorCode,
        error_message: errorMessage,
        error_stack: options.errorStack,
        function_name: options.functionName,
        request_id: options.requestId,
        user_id: options.userId,
        profile_id: options.profileId,
        primary_model: options.primaryModel,
        fallback_model: options.fallbackModel,
        fallback_used: options.fallbackUsed || false,
        fallback_success: options.fallbackSuccess,
        input_tokens: options.inputTokens,
        output_tokens: options.outputTokens,
        latency_ms: options.latencyMs,
        metadata: options.metadata || {},
      })
      .select('user_error_ref')
      .single()
    
    if (error) {
      console.error('[ai-service] Failed to log error:', error)
      return null
    }
    
    console.log(`[ai-service] Error logged with ref: ${data.user_error_ref}`)
    return data.user_error_ref
  } catch (e) {
    console.error('[ai-service] Exception while logging error:', e)
    return null
  }
}

// ============================================
// CLAUDE API CALL
// ============================================
async function callClaude(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: { temperature: number; maxTokens: number }
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens,
      system: systemPrompt,
      messages,
      temperature: options.temperature,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    const status = response.status
    
    if (status === 429) {
      throw { code: AI_ERROR_CODES.CLAUDE_RATE_LIMIT, message: errorBody, status }
    } else if (status === 529) {
      throw { code: AI_ERROR_CODES.CLAUDE_OVERLOADED, message: errorBody, status }
    } else {
      throw { code: AI_ERROR_CODES.CLAUDE_API_ERROR, message: errorBody, status }
    }
  }

  const data = await response.json()
  return {
    content: data.content?.[0]?.text || '',
    usage: {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
    },
  }
}

// ============================================
// OPENAI API CALL
// ============================================
async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  options: { temperature: number; maxTokens: number; jsonMode: boolean }
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const requestBody: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages,
    temperature: options.temperature,
    max_completion_tokens: options.maxTokens,
  }
  
  if (options.jsonMode) {
    requestBody.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    const status = response.status
    
    if (status === 429) {
      throw { code: AI_ERROR_CODES.OPENAI_RATE_LIMIT, message: errorBody, status }
    } else {
      throw { code: AI_ERROR_CODES.OPENAI_API_ERROR, message: errorBody, status }
    }
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
    },
  }
}

// ============================================
// JSON EXTRACTION HELPER
// ============================================
function extractJSON(content: string): string {
  let jsonContent = content.trim()
  
  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.slice(7)
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.slice(3)
  }
  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.slice(0, -3)
  }
  
  return jsonContent.trim()
}

// ============================================
// MAIN AI SERVICE
// ============================================
export const aiService = {
  /**
   * Call AI with automatic fallback: Claude → GPT-5.2
   * Returns string content
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    options: AIServiceOptions
  ): Promise<AIServiceResult<string>> {
    const {
      temperature = 0.7,
      maxTokens = 4000,
      functionName,
      userId,
      profileId,
      requestId,
      enableFallback = true,
    } = options

    const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    const startTime = Date.now()
    let fallbackUsed = false
    let primaryError: { code: AIErrorCode; message: string } | null = null

    // Try Claude first
    if (claudeKey) {
      try {
        console.log(`[ai-service] Trying Claude Opus 4.6 for ${functionName}`)
        const result = await callClaude(
          claudeKey,
          systemPrompt,
          [{ role: 'user', content: userMessage }],
          { temperature, maxTokens }
        )
        
        const latencyMs = Date.now() - startTime
        console.log(`[ai-service] Claude success in ${latencyMs}ms`)
        
        return {
          data: result.content,
          model: CLAUDE_MODEL,
          fallbackUsed: false,
          usage: { inputTokens: result.usage.input, outputTokens: result.usage.output },
          latencyMs,
        }
      } catch (e: any) {
        primaryError = { code: e.code || AI_ERROR_CODES.CLAUDE_API_ERROR, message: e.message || String(e) }
        console.error(`[ai-service] Claude failed: ${primaryError.code} - ${primaryError.message}`)
        
        if (!enableFallback || !openaiKey) {
          const userErrorRef = await logError(primaryError.code, primaryError.message, {
            functionName,
            userId,
            profileId,
            requestId,
            primaryModel: CLAUDE_MODEL,
            fallbackUsed: false,
            latencyMs: Date.now() - startTime,
          })
          
          throw new AIServiceError(
            primaryError.code,
            primaryError.message,
            functionName,
            CLAUDE_MODEL,
            false,
            userErrorRef || undefined
          )
        }
      }
    }

    // Fallback to GPT-5.2
    if (openaiKey && enableFallback) {
      fallbackUsed = true
      try {
        console.log(`[ai-service] Fallback to GPT-5.2 for ${functionName}`)
        const result = await callOpenAI(
          openaiKey,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          { temperature, maxTokens, jsonMode: false }
        )
        
        const latencyMs = Date.now() - startTime
        console.log(`[ai-service] GPT-5.2 fallback success in ${latencyMs}ms`)
        
        // Log the primary failure with successful fallback
        if (primaryError) {
          await logError(primaryError.code, primaryError.message, {
            functionName,
            userId,
            profileId,
            requestId,
            primaryModel: CLAUDE_MODEL,
            fallbackModel: OPENAI_MODEL,
            fallbackUsed: true,
            fallbackSuccess: true,
            latencyMs,
          })
        }
        
        return {
          data: result.content,
          model: OPENAI_MODEL,
          fallbackUsed: true,
          usage: { inputTokens: result.usage.input, outputTokens: result.usage.output },
          latencyMs,
        }
      } catch (e: any) {
        const fallbackError = { code: e.code || AI_ERROR_CODES.OPENAI_API_ERROR, message: e.message || String(e) }
        console.error(`[ai-service] GPT-5.2 also failed: ${fallbackError.code}`)
        
        const userErrorRef = await logError(AI_ERROR_CODES.ALL_MODELS_FAILED, 
          `Primary: ${primaryError?.message || 'No Claude key'}. Fallback: ${fallbackError.message}`, {
            functionName,
            userId,
            profileId,
            requestId,
            primaryModel: CLAUDE_MODEL,
            fallbackModel: OPENAI_MODEL,
            fallbackUsed: true,
            fallbackSuccess: false,
            latencyMs: Date.now() - startTime,
            metadata: { primaryError, fallbackError },
          })
        
        throw new AIServiceError(
          AI_ERROR_CODES.ALL_MODELS_FAILED,
          'All AI models failed. Please try again later.',
          functionName,
          `${CLAUDE_MODEL} → ${OPENAI_MODEL}`,
          true,
          userErrorRef || undefined
        )
      }
    }

    // No API keys available
    const userErrorRef = await logError(AI_ERROR_CODES.MISSING_API_KEY, 'No AI API keys configured', {
      functionName,
      userId,
      profileId,
      requestId,
    })
    
    throw new AIServiceError(
      AI_ERROR_CODES.MISSING_API_KEY,
      'No AI API keys configured',
      functionName,
      'none',
      false,
      userErrorRef || undefined
    )
  },

  /**
   * Call AI and parse response as JSON
   */
  async json<T>(
    systemPrompt: string,
    userMessage: string,
    options: AIServiceOptions
  ): Promise<AIServiceResult<T>> {
    const {
      temperature = 0,
      maxTokens = 4000,
      functionName,
      userId,
      profileId,
      requestId,
      enableFallback = true,
    } = options

    const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    const startTime = Date.now()
    let fallbackUsed = false
    let primaryError: { code: AIErrorCode; message: string } | null = null

    // Enhanced system prompt for JSON
    const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: Tu DOIS répondre UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après. Pas de markdown, pas de \`\`\`json, juste le JSON pur.`

    // Try Claude first
    if (claudeKey) {
      try {
        console.log(`[ai-service] Trying Claude Opus 4.6 (JSON mode) for ${functionName}`)
        const result = await callClaude(
          claudeKey,
          jsonSystemPrompt,
          [{ role: 'user', content: userMessage }],
          { temperature, maxTokens }
        )
        
        const jsonStr = extractJSON(result.content)
        const parsed = JSON.parse(jsonStr) as T
        
        const latencyMs = Date.now() - startTime
        console.log(`[ai-service] Claude JSON success in ${latencyMs}ms`)
        
        return {
          data: parsed,
          model: CLAUDE_MODEL,
          fallbackUsed: false,
          usage: { inputTokens: result.usage.input, outputTokens: result.usage.output },
          latencyMs,
        }
      } catch (e: any) {
        const isJsonError = e instanceof SyntaxError
        primaryError = { 
          code: isJsonError ? AI_ERROR_CODES.JSON_PARSE_ERROR : (e.code || AI_ERROR_CODES.CLAUDE_API_ERROR), 
          message: e.message || String(e) 
        }
        console.error(`[ai-service] Claude failed: ${primaryError.code} - ${primaryError.message}`)
        
        if (!enableFallback || !openaiKey) {
          const userErrorRef = await logError(primaryError.code, primaryError.message, {
            functionName,
            userId,
            profileId,
            requestId,
            primaryModel: CLAUDE_MODEL,
            fallbackUsed: false,
            latencyMs: Date.now() - startTime,
          })
          
          throw new AIServiceError(
            primaryError.code,
            primaryError.message,
            functionName,
            CLAUDE_MODEL,
            false,
            userErrorRef || undefined
          )
        }
      }
    }

    // Fallback to GPT-5.2 with native JSON mode
    if (openaiKey && enableFallback) {
      fallbackUsed = true
      try {
        console.log(`[ai-service] Fallback to GPT-5.2 (JSON mode) for ${functionName}`)
        const result = await callOpenAI(
          openaiKey,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          { temperature, maxTokens, jsonMode: true }
        )
        
        const parsed = JSON.parse(result.content) as T
        
        const latencyMs = Date.now() - startTime
        console.log(`[ai-service] GPT-5.2 JSON fallback success in ${latencyMs}ms`)
        
        // Log the primary failure with successful fallback
        if (primaryError) {
          await logError(primaryError.code, primaryError.message, {
            functionName,
            userId,
            profileId,
            requestId,
            primaryModel: CLAUDE_MODEL,
            fallbackModel: OPENAI_MODEL,
            fallbackUsed: true,
            fallbackSuccess: true,
            latencyMs,
          })
        }
        
        return {
          data: parsed,
          model: OPENAI_MODEL,
          fallbackUsed: true,
          usage: { inputTokens: result.usage.input, outputTokens: result.usage.output },
          latencyMs,
        }
      } catch (e: any) {
        const isJsonError = e instanceof SyntaxError
        const fallbackError = { 
          code: isJsonError ? AI_ERROR_CODES.JSON_PARSE_ERROR : (e.code || AI_ERROR_CODES.OPENAI_API_ERROR), 
          message: e.message || String(e) 
        }
        console.error(`[ai-service] GPT-5.2 also failed: ${fallbackError.code}`)
        
        const userErrorRef = await logError(AI_ERROR_CODES.ALL_MODELS_FAILED, 
          `Primary: ${primaryError?.message || 'No Claude key'}. Fallback: ${fallbackError.message}`, {
            functionName,
            userId,
            profileId,
            requestId,
            primaryModel: CLAUDE_MODEL,
            fallbackModel: OPENAI_MODEL,
            fallbackUsed: true,
            fallbackSuccess: false,
            latencyMs: Date.now() - startTime,
            metadata: { primaryError, fallbackError },
          })
        
        throw new AIServiceError(
          AI_ERROR_CODES.ALL_MODELS_FAILED,
          'All AI models failed. Please try again later.',
          functionName,
          `${CLAUDE_MODEL} → ${OPENAI_MODEL}`,
          true,
          userErrorRef || undefined
        )
      }
    }

    // No API keys available
    const userErrorRef = await logError(AI_ERROR_CODES.MISSING_API_KEY, 'No AI API keys configured', {
      functionName,
      userId,
      profileId,
      requestId,
    })
    
    throw new AIServiceError(
      AI_ERROR_CODES.MISSING_API_KEY,
      'No AI API keys configured',
      functionName,
      'none',
      false,
      userErrorRef || undefined
    )
  },

  /**
   * Simple classification using GPT-5-mini (20x cheaper than GPT-5.2)
   * Optimized for fast, simple classification tasks
   * Does NOT use Claude fallback - direct to GPT-5-mini
   */
  async classify(
    systemPrompt: string,
    userMessage: string,
    options: AIServiceOptions
  ): Promise<string> {
    const startTime = Date.now()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const { functionName, userId, profileId } = options
    
    if (!openaiKey) {
      throw new AIServiceError(
        AI_ERROR_CODES.MISSING_API_KEY,
        'OPENAI_API_KEY not configured',
        functionName,
        OPENAI_MODEL_LIGHT,
        false
      )
    }
    
    try {
      console.log(`[ai-service] Classification with gpt-5-mini for ${functionName}`)
      
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL_LIGHT,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_completion_tokens: 100,
          // Note: gpt-5-mini only supports temperature=1 (default)
        }),
      })
      
      if (!response.ok) {
        const errorBody = await response.text()
        throw { code: AI_ERROR_CODES.OPENAI_API_ERROR, message: errorBody }
      }
      
      const data = await response.json()
      const result = data.choices?.[0]?.message?.content?.trim() || ''
      const latencyMs = Date.now() - startTime
      const inputTokens = data.usage?.prompt_tokens || 0
      const outputTokens = data.usage?.completion_tokens || 0
      
      console.log(`[ai-service] gpt-5-mini classification success in ${latencyMs}ms (${inputTokens}+${outputTokens} tokens)`)
      
      // Log usage for cost tracking
      await this.logUsage({
        functionName,
        provider: 'openai',
        model: OPENAI_MODEL_LIGHT,
        modelType: 'classification',
        inputTokens,
        outputTokens,
        latencyMs,
        success: true,
        userId,
        profileId,
      })
      
      return result
    } catch (e: any) {
      const latencyMs = Date.now() - startTime
      const errorMessage = e.message || String(e)
      
      // Log failed usage
      await this.logUsage({
        functionName,
        provider: 'openai',
        model: OPENAI_MODEL_LIGHT,
        modelType: 'classification',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        success: false,
        errorMessage,
        userId,
        profileId,
      })
      
      throw new AIServiceError(
        e.code || AI_ERROR_CODES.OPENAI_API_ERROR,
        errorMessage,
        functionName,
        OPENAI_MODEL_LIGHT,
        false
      )
    }
  },

  /**
   * Log AI usage for cost tracking
   * Inserts into ai_usage_logs table
   */
  async logUsage(params: {
    functionName: string
    provider: 'openai' | 'anthropic'
    model: string
    modelType: 'chat' | 'embedding' | 'classification'
    inputTokens: number
    outputTokens: number
    latencyMs: number
    success: boolean
    errorMessage?: string
    fallbackUsed?: boolean
    primaryModel?: string
    userId?: string
    profileId?: string
    requestId?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!supabaseUrl || !supabaseKey) return
      
      const supabase = createClient(supabaseUrl, supabaseKey)
      const costs = calculateCost(params.model, params.inputTokens, params.outputTokens)
      
      await supabase.from('ai_usage_logs').insert({
        function_name: params.functionName,
        provider: params.provider,
        model: params.model,
        model_type: params.modelType,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        input_cost_usd: costs.inputCost,
        output_cost_usd: costs.outputCost,
        latency_ms: params.latencyMs,
        success: params.success,
        error_message: params.errorMessage,
        fallback_used: params.fallbackUsed || false,
        primary_model: params.primaryModel,
        user_id: params.userId,
        profile_id: params.profileId,
        request_id: params.requestId,
        metadata: params.metadata || {},
      })
    } catch (e) {
      console.error('[ai-service] Failed to log usage:', e)
    }
  },
}

export default aiService
