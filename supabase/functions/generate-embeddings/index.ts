import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { table = 'audiences' } = await req.json().catch(() => ({}))

    let results: { id: string; name: string; success: boolean }[] = []

    if (table === 'audiences') {
      // Get audiences without embeddings
      const { data: audiences, error } = await supabase
        .from('audiences')
        .select('id, name, embedding_description')
        .is('embedding', null)

      if (error) throw error
      if (!audiences || audiences.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No audiences need embedding regeneration', count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[generate-embeddings] Processing ${audiences.length} audiences`)

      for (const audience of audiences) {
        try {
          const textToEmbed = audience.embedding_description || audience.name
          
          // Call OpenAI Embeddings API
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: textToEmbed,
            }),
          })

          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text()
            throw new Error(`OpenAI API error: ${errorText}`)
          }

          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.data[0].embedding

          // Update audience with new embedding
          const { error: updateError } = await supabase
            .from('audiences')
            .update({ embedding: JSON.stringify(embedding) })
            .eq('id', audience.id)

          if (updateError) throw updateError

          results.push({ id: audience.id, name: audience.name, success: true })
          console.log(`[generate-embeddings] ✓ ${audience.name}`)

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (err) {
          console.error(`[generate-embeddings] ✗ ${audience.name}:`, err)
          results.push({ id: audience.id, name: audience.name, success: false })
        }
      }
    }

    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({
        message: `Generated embeddings for ${successCount}/${results.length} ${table}`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[generate-embeddings] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
