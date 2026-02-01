import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Image, X, Send, Camera, Loader2, Paperclip, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export interface Attachment {
  id: string
  type: 'image' | 'screenshot'
  url: string // Data URL or blob URL
  name?: string
}

export interface MultimodalInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onAttachmentsChange?: (attachments: Attachment[]) => void
  attachments?: Attachment[]
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  variant?: 'full' | 'compact' | 'inline'
  showVoice?: boolean
  showScreenshot?: boolean
  showImageUpload?: boolean
  className?: string
  inputClassName?: string
  autoFocus?: boolean
}

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function MultimodalInput({
  value,
  onChange,
  onSubmit,
  onAttachmentsChange,
  attachments = [],
  placeholder = "Tapez votre message...",
  disabled = false,
  isLoading = false,
  variant = 'full',
  showVoice = true,
  showScreenshot = true,
  showImageUpload = true,
  className,
  inputClassName,
  autoFocus = false,
}: MultimodalInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentValueRef = useRef(value) // Track current value for transcription

  // Keep ref in sync with value
  useEffect(() => {
    currentValueRef.current = value
  }, [value])

  // Check browser support
  const micSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
  const screenshotSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxHeight = variant === 'full' ? 200 : 120
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [variant])

  useEffect(() => {
    adjustTextareaHeight()
  }, [value, interimTranscript, adjustTextareaHeight])

  // Start recording with Whisper
  const startRecording = useCallback(async () => {
    if (!micSupported) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Setup audio analysis for visualizer
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      // Animate audio level
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop audio analysis
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (audioContextRef.current) audioContextRef.current.close()
        stream.getTracks().forEach(track => track.stop())
        setAudioLevel(0)

        // Transcribe with Whisper
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1)
      }, 1000)

    } catch (e) {
      console.error('Microphone access error:', e)
      setInterimTranscript('Erreur: accès micro refusé')
      setTimeout(() => setInterimTranscript(''), 3000)
    }
  }, [micSupported])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      setIsTranscribing(true)
    }
  }, [isRecording])

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  // Transcribe audio with Whisper
  const transcribeAudio = async (audioBlob: Blob) => {
    setInterimTranscript('Transcription en cours...')
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', 'fr')

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      })

      if (error) throw error

      if (data?.success && data?.text) {
        // Use ref to get current value (avoids stale closure)
        const currentValue = currentValueRef.current
        onChange(currentValue + (currentValue ? ' ' : '') + data.text)
        setInterimTranscript('')
      } else {
        throw new Error(data?.error || 'Transcription failed')
      }
    } catch (e) {
      console.error('Transcription error:', e)
      setInterimTranscript('Erreur de transcription')
      setTimeout(() => setInterimTranscript(''), 3000)
    } finally {
      setIsTranscribing(false)
      setRecordingDuration(0)
    }
  }

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    if (!screenshotSupported) return
    setIsCapturing(true)

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: false,
      })

      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop())

      const dataUrl = canvas.toDataURL('image/png')
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        type: 'screenshot',
        url: dataUrl,
        name: `Capture ${new Date().toLocaleTimeString('fr-FR')}`,
      }

      onAttachmentsChange?.([...attachments, newAttachment])
    } catch (e) {
      // User cancelled or error
      console.log('Screenshot cancelled or error:', e)
    } finally {
      setIsCapturing(false)
    }
  }, [screenshotSupported, attachments, onAttachmentsChange])

  // Handle file upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return

      const reader = new FileReader()
      reader.onload = () => {
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'image',
          url: reader.result as string,
          name: file.name,
        }
        onAttachmentsChange?.([...attachments, newAttachment])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }, [attachments, onAttachmentsChange])

  // Handle paste for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue

        const reader = new FileReader()
        reader.onload = () => {
          const newAttachment: Attachment = {
            id: crypto.randomUUID(),
            type: 'image',
            url: reader.result as string,
            name: 'Image collée',
          }
          onAttachmentsChange?.([...attachments, newAttachment])
        }
        reader.readAsDataURL(file)
        break
      }
    }
  }, [attachments, onAttachmentsChange])

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    onAttachmentsChange?.(attachments.filter(a => a.id !== id))
  }, [attachments, onAttachmentsChange])

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (disabled || isLoading || (!value.trim() && attachments.length === 0)) return
    onSubmit()
  }, [disabled, isLoading, value, attachments, onSubmit])

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // Voice recording indicator component with real audio visualization
  const VoiceRecordingIndicator = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
      isTranscribing ? "bg-violet-50 border-violet-200" : "bg-red-50 border-red-200",
      compact ? "text-xs" : "text-sm"
    )}>
      <div className="flex items-center gap-1.5">
        {isTranscribing ? (
          <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}
        <span className={cn(
          "font-medium",
          isTranscribing ? "text-violet-600" : "text-red-600"
        )}>
          {isTranscribing ? 'Whisper...' : formatDuration(recordingDuration)}
        </span>
      </div>
      {!isTranscribing && (
        <div className="flex gap-0.5 items-end h-4">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="w-1 bg-red-400 rounded-full transition-all duration-75"
              style={{ 
                height: `${4 + audioLevel * 12 * (0.5 + Math.random() * 0.5)}px`,
              }}
            />
          ))}
        </div>
      )}
      {interimTranscript && (
        <span className={cn(
          "italic truncate max-w-[150px]",
          isTranscribing ? "text-violet-500" : "text-red-500"
        )}>
          {interimTranscript}
        </span>
      )}
    </div>
  )

  // Compact variant (for feedback/regeneration)
  if (variant === 'compact') {
    return (
      <div className={cn("relative space-y-2", className)}>
        {/* Voice recording indicator */}
        {isRecording && <VoiceRecordingIndicator compact />}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map(att => (
              <div key={att.id} className="relative group">
                <img 
                  src={att.url} 
                  alt={att.name} 
                  className="w-12 h-12 object-cover rounded-lg border border-neutral-200"
                />
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value + (interimTranscript ? ` ${interimTranscript}` : '')}
              onChange={(e) => {
                const newValue = interimTranscript 
                  ? e.target.value.replace(` ${interimTranscript}`, '').replace(interimTranscript, '')
                  : e.target.value
                onChange(newValue)
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isRecording ? '🎤 Parlez, je transcris...' : placeholder}
              disabled={disabled || isLoading}
              autoFocus={autoFocus}
              className={cn(
                "w-full min-h-[44px] max-h-[120px] px-3 py-2 pr-20 resize-none rounded-lg border text-sm transition-all overflow-y-auto",
                isRecording 
                  ? "border-red-300 bg-red-50/30 focus:border-red-400" 
                  : "border-neutral-200 focus:border-violet-300",
                "focus:outline-none focus:ring-1 focus:ring-violet-200",
                inputClassName
              )}
              rows={1}
            />
            
            {/* Inline action buttons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {showVoice && micSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={disabled || isTranscribing}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    isRecording 
                      ? "text-white bg-red-500 shadow-sm" 
                      : isTranscribing
                      ? "text-violet-500 bg-violet-100"
                      : "text-neutral-400 hover:text-violet-600 hover:bg-violet-50"
                  )}
                  title={isRecording ? "Arrêter" : isTranscribing ? "Transcription..." : "Dictée vocale (Whisper)"}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
              {showImageUpload && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="p-1.5 rounded-md text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  title="Ajouter une image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  // Inline variant (minimal, for quick feedback)
  if (variant === 'inline') {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Voice recording indicator */}
        {isRecording && <VoiceRecordingIndicator compact />}
        
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value + (interimTranscript ? ` ${interimTranscript}` : '')}
            onChange={(e) => {
              const newValue = interimTranscript 
                ? e.target.value.replace(` ${interimTranscript}`, '').replace(interimTranscript, '')
                : e.target.value
              onChange(newValue)
            }}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? '🎤 Parlez...' : placeholder}
            disabled={disabled || isLoading}
            autoFocus={autoFocus}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border text-sm transition-all resize-none min-h-[40px] max-h-[80px] overflow-y-auto",
              isRecording ? "border-red-300 bg-red-50/30" : "border-neutral-200",
              "focus:outline-none focus:border-violet-300",
              inputClassName
            )}
            rows={1}
          />
          {showVoice && micSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={disabled || isTranscribing}
              className={cn(
                "p-2 rounded-lg transition-all shrink-0",
                isRecording 
                  ? "text-white bg-red-500 shadow-sm" 
                  : isTranscribing
                  ? "text-violet-500 bg-violet-100"
                  : "text-neutral-400 hover:text-violet-600 hover:bg-violet-50"
              )}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <Square className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Full variant (main assistant input)
  return (
    <div className={cn("space-y-3", className)}>
      {/* Voice recording indicator - prominent */}
      {(isRecording || isTranscribing) && (
        <div className={cn(
          "flex items-center justify-between px-4 py-2.5 rounded-xl border",
          isTranscribing ? "bg-violet-50 border-violet-200" : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              ) : (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              )}
              <span className={cn(
                "font-semibold text-sm",
                isTranscribing ? "text-violet-600" : "text-red-600"
              )}>
                {isTranscribing ? 'Transcription Whisper...' : formatDuration(recordingDuration)}
              </span>
            </div>
            {!isTranscribing && (
              <div className="flex gap-0.5 items-end h-5">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-red-400 rounded-full transition-all duration-75"
                    style={{ 
                      height: `${4 + audioLevel * 16 * (0.5 + Math.random() * 0.5)}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {!isTranscribing && (
            <button
              onClick={stopRecording}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Square className="w-3 h-3" />
              Arrêter
            </button>
          )}
        </div>
      )}

      {/* Interim transcript display */}
      {interimTranscript && (
        <div className="px-4 py-2 rounded-lg bg-violet-50 border border-violet-200">
          <p className="text-sm text-violet-700 italic">
            <span className="text-violet-400 mr-1">🎤</span>
            {interimTranscript}
            <span className="animate-pulse">|</span>
          </p>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map(att => (
            <div key={att.id} className="relative group">
              <div className="w-20 h-20 rounded-xl border-2 border-neutral-200 overflow-hidden bg-neutral-50">
                <img 
                  src={att.url} 
                  alt={att.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 left-1 right-1">
                <span className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded truncate block">
                  {att.type === 'screenshot' ? '📸' : '🖼️'} {att.name?.slice(0, 12)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-3">
        {/* Action buttons */}
        <div className="flex items-center gap-1 pb-1.5">
          {showScreenshot && screenshotSupported && (
            <button
              type="button"
              onClick={captureScreenshot}
              disabled={disabled || isCapturing}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                isCapturing 
                  ? "bg-violet-100 text-violet-600" 
                  : "bg-neutral-100 text-neutral-500 hover:bg-violet-100 hover:text-violet-600"
              )}
              title="Capturer l'écran"
            >
              {isCapturing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
          )}
          {showImageUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2.5 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-violet-100 hover:text-violet-600 transition-all"
              title="Ajouter une image"
            >
              <Image className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Text input - now textarea for long texts */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isRecording ? '🎤 Parlez, je transcris en temps réel...' : placeholder}
            disabled={disabled || isLoading}
            autoFocus={autoFocus}
            className={cn(
              "w-full px-4 py-3 pr-14 rounded-xl border text-[14px] transition-all resize-none overflow-y-auto",
              "min-h-[48px] max-h-[200px]",
              isRecording 
                ? "border-red-300 bg-red-50/20 focus:border-red-400 focus:ring-red-200" 
                : "border-neutral-200 focus:border-neutral-300 focus:ring-neutral-200",
              "placeholder:text-neutral-400 focus:outline-none focus:ring-1",
              inputClassName
            )}
            rows={1}
          />
          
          {/* Voice button inside input */}
          {showVoice && micSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={disabled || isTranscribing}
              className={cn(
                "absolute right-3 bottom-2.5 p-2 rounded-lg transition-all",
                isRecording 
                  ? "text-white bg-red-500 shadow-md" 
                  : isTranscribing
                  ? "text-violet-500 bg-violet-100"
                  : "text-neutral-400 hover:text-violet-600 hover:bg-violet-50"
              )}
              title={isRecording ? "Arrêter" : isTranscribing ? "Transcription..." : "Dictée vocale (Whisper)"}
            >
              {isTranscribing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <Square className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || isLoading || (!value.trim() && attachments.length === 0)}
          className={cn(
            "p-3 rounded-xl transition-all shrink-0",
            (value.trim() || attachments.length > 0) && !isLoading && !disabled
              ? "bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm"
              : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Status hints */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-neutral-400">
          GPT-5.2 + Whisper • Entrée pour envoyer
          {attachments.length > 0 && ` • ${attachments.length} pièce(s) jointe(s)`}
        </p>
        {value.length > 200 && (
          <p className="text-[11px] text-neutral-400">
            {value.length} caractères
          </p>
        )}
      </div>
    </div>
  )
}

// Hook for managing multimodal state
export function useMultimodalInput() {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const reset = useCallback(() => {
    setValue('')
    setAttachments([])
  }, [])

  const getContent = useCallback(() => {
    return {
      text: value,
      attachments,
      hasAttachments: attachments.length > 0,
    }
  }, [value, attachments])

  return {
    value,
    setValue,
    attachments,
    setAttachments,
    reset,
    getContent,
  }
}
