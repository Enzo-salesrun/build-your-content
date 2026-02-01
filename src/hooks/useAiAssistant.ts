import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ContextSummary {
  topics_count: number
  audiences_count: number
  posts_analyzed: number
  templates_available: number
}

export interface SourceKnowledge {
  title: string
  type: string
  preview: string
}

export interface SourceAudience {
  name: string
  pain_points?: string[]
}

export interface Sources {
  knowledge: SourceKnowledge[]
  posts_samples: { hook: string }[]
  topics_used: string[]
  audiences_used: SourceAudience[]
}

export function useAiAssistant() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null)
  const [sources, setSources] = useState<Sources | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [])

  // Load all sessions
  const loadSessions = useCallback(async () => {
    if (!userId) return
    setIsLoadingSessions(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setSessions((data || []) as ChatSession[])
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError('Erreur lors du chargement des sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [userId])

  // Load messages for a session
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      const loadedMessages: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }))
      
      setMessages(loadedMessages)
      setCurrentSessionId(sessionId)
    } catch (err) {
      console.error('Error loading session messages:', err)
      setError('Erreur lors du chargement des messages')
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  // Create a new session
  const createNewSession = useCallback(async (): Promise<string | null> => {
    if (!userId) return null
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId })
        .select('id')
        .single()
      
      if (error) throw error
      return data.id
    } catch (err) {
      console.error('Error creating session:', err)
      return null
    }
  }, [userId])

  // Save message to database
  const saveMessage = useCallback(async (sessionId: string, role: string, content: string) => {
    try {
      await supabase
        .from('chat_messages')
        .insert({ session_id: sessionId, role, content })
    } catch (err) {
      console.error('Error saving message:', err)
    }
  }, [])

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setMessages([])
    setCurrentSessionId(null)
    setContextSummary(null)
    setError(null)
  }, [])

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
      
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      if (currentSessionId === sessionId) {
        startNewConversation()
      }
    } catch (err) {
      console.error('Error deleting session:', err)
    }
  }, [currentSessionId, startNewConversation])

  // Send a message with optional filters
  const sendMessage = useCallback(async (
    messageText: string, 
    filters?: { author_id?: string; topic_id?: string; excluded_posts?: { id: string; hook: string }[] }
  ) => {
    if (!messageText.trim() || isLoading || !userId) return
    setError(null)

    // Create session if needed
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createNewSession()
      if (!sessionId) {
        setError('Impossible de créer la session')
        return
      }
      setCurrentSessionId(sessionId)
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Save user message to DB
    await saveMessage(sessionId, 'user', messageText.trim())

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: messageText.trim(),
          conversation_history: conversationHistory,
          filters,
        },
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Save assistant message to DB
      await saveMessage(sessionId, 'assistant', data.response)
      
      if (data.context_summary) {
        setContextSummary(data.context_summary)
      }
      if (data.sources) {
        setSources(data.sources)
      }

      // Refresh sessions list to update titles
      loadSessions()
    } catch (err) {
      console.error('Error calling AI assistant:', err)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      setError("Erreur lors de l'appel à l'assistant")
    } finally {
      setIsLoading(false)
    }
  }, [userId, currentSessionId, messages, isLoading, createNewSession, saveMessage, loadSessions])

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId) || null

  return {
    // State
    sessions,
    currentSession,
    currentSessionId,
    messages,
    isLoading,
    isLoadingSessions,
    isLoadingMessages,
    contextSummary,
    sources,
    userId,
    error,
    
    // Actions
    loadSessions,
    loadSessionMessages,
    sendMessage,
    startNewConversation,
    deleteSession,
    setCurrentSessionId,
  }
}
