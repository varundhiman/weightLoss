import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderUser {
  user_id: string
  user_email: string
  user_display_name: string
  group_id: string
  group_name: string
  days_since_last_entry: number
  last_reminder_sent: string | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting weight reminders function...')
    
    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📊 Fetching users who need reminders...')

    // Get users who need reminders
    const { data: usersNeedingReminders, error: fetchError } = await supabaseAdmin
      .rpc('get_users_needing_reminders')

    if (fetchError) {
      console.error('❌ Error fetching users needing reminders:', fetchError)
      throw fetchError
    }

    console.log(`📋 Found ${usersNeedingReminders?.length || 0} users needing reminders`)

    if (!usersNeedingReminders || usersNeedingReminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users need reminders at this time',
          reminders_sent: 0,
          debug_info: {
            timestamp: new Date().toISOString(),
            function_executed: true,
            users_checked: 'All active group members'
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    let successCount = 0
    let errorCount = 0
    const processedUsers: any[] = []

    // Send reminders to each user
    for (const user of usersNeedingReminders as ReminderUser[]) {
      try {
        console.log(`📧 Processing reminder for ${user.user_email} (${user.user_display_name})`)
        console.log(`   - Group: ${user.group_name}`)
        console.log(`   - Days since last entry: ${user.days_since_last_entry}`)

        // Create personalized email content
        const emailSubject = `Don't forget to log your weight - ${user.group_name}`
        const emailBody = createReminderEmailBody(user)

        // Send email using Resend
        const emailSent = await sendReminderEmail(user.user_email, emailSubject, emailBody)

        // Log the reminder attempt
        const { error: logError } = await supabaseAdmin
          .rpc('log_reminder_sent', {
            p_user_id: user.user_id,
            p_group_id: user.group_id,
            p_reminder_type: 'weight_logging',
            p_email_sent: emailSent
          })

        if (logError) {
          console.error('❌ Error logging reminder:', logError)
          errorCount++
        } else {
          console.log(`✅ Reminder processed for ${user.user_email}`)
          successCount++
        }

        processedUsers.push({
          email: user.user_email,
          name: user.user_display_name,
          group: user.group_name,
          days_since_last_entry: user.days_since_last_entry,
          email_sent: emailSent
        })

      } catch (error) {
        console.error(`❌ Error sending reminder to ${user.user_email}:`, error)
        errorCount++
        
        // Still log the failed attempt
        await supabaseAdmin
          .rpc('log_reminder_sent', {
            p_user_id: user.user_id,
            p_group_id: user.group_id,
            p_reminder_type: 'weight_logging',
            p_email_sent: false
          })

        processedUsers.push({
          email: user.user_email,
          name: user.user_display_name,
          group: user.group_name,
          days_since_last_entry: user.days_since_last_entry,
          email_sent: false,
          error: error.message
        })
      }
    }

    console.log(`🎉 Reminder process completed: ${successCount} success, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reminder process completed`,
        reminders_sent: successCount,
        errors: errorCount,
        total_processed: usersNeedingReminders.length,
        debug_info: {
          timestamp: new Date().toISOString(),
          email_service_status: Deno.env.get('RESEND_API_KEY') ? 'CONFIGURED' : 'NOT CONFIGURED',
          processed_users: processedUsers
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('💥 Error in send-weight-reminders function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        debug_info: {
          timestamp: new Date().toISOString(),
          function_name: 'send-weight-reminders',
          error_type: error.constructor.name
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function createReminderEmailBody(user: ReminderUser): string {
  const daysText = user.days_since_last_entry === 999 
    ? "You haven't logged your weight yet" 
    : `It's been ${user.days_since_last_entry} days since your last weight entry`

  const appUrl = 'https://glowing-cobbler-be0e91.netlify.app'

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #10B981 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Weight Tracker Reminder</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Stay on track with your fitness goals!</p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0;">Hi ${user.user_display_name}! 👋</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
            ${daysText} in your <strong>${user.group_name}</strong> group.
          </p>
          <p style="color: #4b5563; line-height: 1.6; margin: 0;">
            Regular tracking helps you stay motivated and see your progress over time. Your group members are counting on your participation!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" 
             style="background: linear-gradient(135deg, #8B5CF6 0%, #10B981 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Log Your Weight Now
          </a>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            You're receiving this because you're a member of the ${user.group_name} group.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
            Reminders are sent when you haven't logged your weight for 5+ days, with a minimum 4-day gap between emails.
          </p>
        </div>
      </body>
    </html>
  `
}

async function sendReminderEmail(email: string, subject: string, body: string): Promise<boolean> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.log(`📧 RESEND_API_KEY not configured - simulating email to ${email}`)
      return false
    }

    console.log(`📧 Sending real email to ${email} using Resend...`)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Weight Tracker <weight@updates.varundhiman.com>',
        to: [email],
        subject: subject,
        html: body,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`❌ Resend API error:`, errorData)
      return false
    }

    const result = await response.json()
    console.log(`✅ Email sent successfully via Resend:`, result.id)
    return true
    
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error)
    return false
  }
}