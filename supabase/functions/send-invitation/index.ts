import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendInvitationRequest {
  profile_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://buildyourcontent.app'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: SendInvitationRequest = await req.json()
    const { profile_id } = body

    if (!profile_id) {
      throw new Error('Missing profile_id')
    }

    // Get the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, first_name, role')
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    if (!profile.email) {
      throw new Error('Profile has no email address')
    }

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === profile.email.toLowerCase())

    let userId: string

    if (existingUser) {
      // User exists, use their ID
      userId = existingUser.id
      console.log(`User already exists: ${userId}`)
    } else {
      // Create new auth user (without password - magic link only)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: profile.full_name,
          first_name: profile.first_name,
          profile_id: profile_id,
        }
      })

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`)
      }

      userId = newUser.user.id
      console.log(`Created new auth user: ${userId}`)

      // Link auth user to profile
      await supabase
        .from('profiles')
        .update({ user_id: userId })
        .eq('id', profile_id)
    }

    // Generate magic link with redirect to /team with auto-connect param
    const redirectUrl = `${appUrl}/team?connect=${profile_id}`
    
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        redirectTo: redirectUrl,
      }
    })

    if (magicLinkError) {
      throw new Error(`Failed to generate magic link: ${magicLinkError.message}`)
    }

    const magicLink = magicLinkData.properties.action_link
    console.log(`Magic link generated for ${profile.email}`)

    // Update profile with invitation info
    await supabase
      .from('profiles')
      .update({
        invitation_status: 'sent',
        invitation_sent_at: new Date().toISOString(),
      })
      .eq('id', profile_id)

    // Send custom email via Resend with the magic link
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Build Your Content <noreply@buildyourcontent.app>',
          to: [profile.email],
          subject: `${profile.first_name || 'Bonjour'}, rejoignez Build Your Content`,
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
                .logo-icon { display: inline-block; width: 32px; height: 32px; background: linear-gradient(135deg, #0A66C2 0%, #0077B5 100%); border-radius: 8px; margin-right: 10px; vertical-align: middle; }
                .greeting { font-size: 24px; font-weight: 600; color: #171717; margin: 0 0 16px 0; }
                .text { color: #525252; font-size: 15px; margin: 0 0 16px 0; }
                .role-badge { display: inline-block; background: #f5f5f5; color: #525252; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; margin: 8px 0 16px 0; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #0A66C2 0%, #0077B5 100%); color: white !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 24px 0; }
                .divider { height: 1px; background: #e5e5e5; margin: 28px 0; }
                .info-box { background: #f5f5f5; border-radius: 8px; padding: 16px; margin-top: 20px; }
                .info-text { color: #525252; font-size: 13px; margin: 0; }
                .footer { text-align: center; margin-top: 32px; }
                .footer-text { color: #a3a3a3; font-size: 12px; margin: 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="header">
                    <span class="logo">
                      <span class="logo-icon"></span>
                      Build Your Content
                    </span>
                  </div>
                  
                  <h1 class="greeting">Bonjour ${profile.first_name || ''} 👋</h1>
                  
                  <p class="text">Vous avez été invité(e) à rejoindre <strong>Build Your Content</strong>, la plateforme de création de contenu LinkedIn.</p>
                  
                  ${profile.role ? `<div class="role-badge">🎯 ${profile.role}</div>` : ''}
                  
                  <p class="text">Cliquez sur le bouton ci-dessous pour vous connecter et lier votre compte LinkedIn.</p>
                  
                  <div style="text-align: center;">
                    <a href="${magicLink}" class="cta-button">
                      Se connecter et lier LinkedIn →
                    </a>
                  </div>
                  
                  <div class="info-box">
                    <p class="info-text">✨ Ce lien vous connectera automatiquement à l'application. Vous pourrez ensuite lier votre compte LinkedIn en un clic.</p>
                  </div>
                </div>
                
                <div class="footer">
                  <p class="footer-text">Ce lien expire dans 1 heure. Ne le partagez pas.</p>
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

      console.log(`✅ Magic link invitation sent to ${profile.email}`)
    } else {
      console.log('⚠️ No RESEND_API_KEY - Magic link:', magicLink)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation Magic Link envoyée à ${profile.email}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending invitation:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
