import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendAnnouncementRequest {
  subject: string
  title: string
  message: string
  cta_text?: string
  cta_url?: string
  badge_text?: string
  badge_style?: 'feature' | 'deprecation' | 'info'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: SendAnnouncementRequest = await req.json()
    const { subject, title, message, cta_text, cta_url, badge_text, badge_style } = body

    const badgeStyles: Record<string, string> = {
      feature: 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);',
      deprecation: 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);',
      info: 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);',
    }
    const resolvedBadgeStyle = badgeStyles[badge_style || 'feature'] || badgeStyles.feature
    const resolvedBadgeText = badge_text || '\u{1F680} Nouvelle fonctionnalit\u{00E9}'

    if (!subject || !title || !message) {
      throw new Error('Missing required fields: subject, title, message')
    }

    // Get all team members with emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, first_name, full_name')
      .not('email', 'is', null)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const emails = profiles?.map(p => p.email).filter(Boolean) || []
    
    if (emails.length === 0) {
      throw new Error('No team members with emails found')
    }

    console.log(`Sending announcement to ${emails.length} team members`)

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Build Your Content <noreply@buildyourcontent.app>',
        to: emails,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; margin: 0; padding: 0; background: #fafafa; }
              .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
              .card { background: white; border-radius: 16px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
              .header { text-align: center; margin-bottom: 32px; }
              .logo { font-size: 20px; font-weight: 700; color: #171717; letter-spacing: -0.5px; }
              .badge { display: inline-block; ${resolvedBadgeStyle} color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
              .title { font-size: 24px; font-weight: 600; color: #171717; margin: 0 0 20px 0; }
              .text { color: #525252; font-size: 15px; margin: 0 0 16px 0; white-space: pre-line; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #0A66C2 0%, #0077B5 100%); color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 24px 0; }
              .footer { text-align: center; margin-top: 32px; }
              .footer-text { color: #a3a3a3; font-size: 12px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <span class="logo">Build Your Content</span>
                </div>
                
                <div style="text-align: center;">
                  <span class="badge">${resolvedBadgeText}</span>
                </div>
                
                <h1 class="title">${title}</h1>
                
                <p class="text">${message}</p>
                
                ${cta_text && cta_url ? `
                <div style="text-align: center;">
                  <a href="${cta_url}" class="cta-button">
                    ${cta_text} →
                  </a>
                </div>
                ` : ''}
              </div>
              
              <div class="footer">
                <p class="footer-text">Build Your Content Team</p>
                <p class="footer-text" style="margin-top: 8px;">buildyourcontent.app</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      console.error('Resend error:', errorData)
      throw new Error(`Failed to send email: ${errorData.message || 'Unknown error'}`)
    }

    const result = await emailResponse.json()
    console.log(`✅ Announcement sent to ${emails.length} team members`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Annonce envoyée à ${emails.length} membres`,
        recipients: emails,
        email_id: result.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending announcement:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
