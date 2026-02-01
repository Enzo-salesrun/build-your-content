import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Get the form data with audio file
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'fr'

    if (!audioFile) {
      throw new Error('No audio file provided')
    }

    console.log(`Transcribing audio: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`)

    // Prepare form data for Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile, audioFile.name || 'audio.webm')
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', language)
    whisperFormData.append('response_format', 'json')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Whisper API error:', errorText)
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Transcription successful:', result.text?.substring(0, 100))

    return new Response(
      JSON.stringify({
        success: true,
        text: result.text,
        language: language,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Transcription error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
