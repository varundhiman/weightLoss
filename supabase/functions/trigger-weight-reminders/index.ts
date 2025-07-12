import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function can be called manually or set up as a cron job
    // It triggers the reminder sending process
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured')
    }

    // Call the send-weight-reminders function
    const reminderResponse = await fetch(`${supabaseUrl}/functions/v1/send-weight-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
    })

    const reminderResult = await reminderResponse.json()

    if (!reminderResponse.ok) {
      throw new Error(`Reminder function failed: ${reminderResult.error}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weight reminder process triggered successfully',
        result: reminderResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error triggering weight reminders:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to trigger weight reminders',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})