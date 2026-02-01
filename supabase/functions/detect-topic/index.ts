import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { aiService } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const text = String(body.text || '').slice(0, 1500)
    const topics = String(body.topics || '')

    if (!text || !topics) {
      return new Response(
        JSON.stringify({ error: 'text and topics are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use GPT-5-mini via aiService.classify (20x cheaper than GPT-5.2)
    const systemPrompt = 'Tu analyses du contenu et retournes UNIQUEMENT l\'UUID du topic le plus pertinent parmi la liste fournie. Si aucun ne correspond, retourne "none".'
    const userMessage = `Texte: ${text}\n\nTopics:\n${topics}\n\nRéponds avec l'UUID uniquement.`

    const topicId = await aiService.classify(
      systemPrompt,
      userMessage,
      { functionName: 'detect-topic' }
    )

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    return new Response(
      JSON.stringify({ 
        topic_id: uuidRegex.test(topicId.trim()) ? topicId.trim() : null,
        raw_response: topicId.trim() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
