import { useState, useCallback } from 'react'
import type { AIErrorInfo } from '@/components/ui/ai-error-toast'

interface UseAIErrorReturn {
  error: AIErrorInfo | null
  setError: (error: AIErrorInfo | null) => void
  handleAPIError: (response: Response | unknown, functionName?: string) => Promise<AIErrorInfo | null>
  clearError: () => void
  hasError: boolean
}

export function useAIError(): UseAIErrorReturn {
  const [error, setError] = useState<AIErrorInfo | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleAPIError = useCallback(async (
    response: Response | unknown,
    functionName?: string
  ): Promise<AIErrorInfo | null> => {
    // Handle fetch Response objects
    if (response instanceof Response) {
      if (response.ok) return null
      
      try {
        const data = await response.json()
        
        // Check if it's an AIServiceError from our backend
        if (data.error?.code || data.code) {
          const aiError: AIErrorInfo = {
            code: data.error?.code || data.code || 'UNKNOWN_ERROR',
            message: data.error?.message || data.message || 'Une erreur est survenue',
            userErrorRef: data.error?.userErrorRef || data.userErrorRef,
            functionName: data.error?.functionName || data.functionName || functionName,
            fallbackAttempted: data.error?.fallbackAttempted || data.fallbackAttempted,
          }
          setError(aiError)
          return aiError
        }
        
        // Generic API error
        const genericError: AIErrorInfo = {
          code: 'UNKNOWN_ERROR',
          message: data.error || data.message || `Erreur ${response.status}`,
          functionName,
        }
        setError(genericError)
        return genericError
      } catch {
        // Failed to parse JSON response
        const parseError: AIErrorInfo = {
          code: 'UNKNOWN_ERROR',
          message: `Erreur serveur (${response.status})`,
          functionName,
        }
        setError(parseError)
        return parseError
      }
    }
    
    // Handle Error objects
    if (response instanceof Error) {
      const errorInfo: AIErrorInfo = {
        code: 'UNKNOWN_ERROR',
        message: response.message,
        functionName,
      }
      setError(errorInfo)
      return errorInfo
    }
    
    // Handle plain objects with error structure
    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>
      const errorInfo: AIErrorInfo = {
        code: (obj.code as string) || 'UNKNOWN_ERROR',
        message: (obj.message as string) || 'Une erreur est survenue',
        userErrorRef: obj.userErrorRef as string | undefined,
        functionName: (obj.functionName as string) || functionName,
        fallbackAttempted: obj.fallbackAttempted as boolean | undefined,
      }
      setError(errorInfo)
      return errorInfo
    }
    
    return null
  }, [])

  return {
    error,
    setError,
    handleAPIError,
    clearError,
    hasError: error !== null,
  }
}

export function parseAIErrorFromResponse(data: unknown): AIErrorInfo | null {
  if (!data || typeof data !== 'object') return null
  
  const obj = data as Record<string, unknown>
  
  // Check for error field
  if (obj.error && typeof obj.error === 'object') {
    const errorObj = obj.error as Record<string, unknown>
    return {
      code: (errorObj.code as string) || 'UNKNOWN_ERROR',
      message: (errorObj.message as string) || 'Une erreur est survenue',
      userErrorRef: errorObj.userErrorRef as string | undefined,
      functionName: errorObj.functionName as string | undefined,
      fallbackAttempted: errorObj.fallbackAttempted as boolean | undefined,
    }
  }
  
  // Check for direct error fields
  if (obj.code && obj.message) {
    return {
      code: obj.code as string,
      message: obj.message as string,
      userErrorRef: obj.userErrorRef as string | undefined,
      functionName: obj.functionName as string | undefined,
      fallbackAttempted: obj.fallbackAttempted as boolean | undefined,
    }
  }
  
  return null
}
