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
    const { groupName } = await req.json()
    
    if (!groupName) {
      return new Response(
        JSON.stringify({ error: 'Group name is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all members of the specified group
    const { data: groupData, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('id, name')
      .eq('name', groupName)
      .single()

    if (groupError || !groupData) {
      return new Response(
        JSON.stringify({ error: `Group "${groupName}" not found` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Get all members of this group with their profile information
    const { data: groupMembers, error: membersError } = await supabaseAdmin
      .from('group_members')
      .select(`
        user_id,
        display_name,
        profiles!inner (
          email
        )
      `)
      .eq('group_id', groupData.id)

    if (membersError) {
      console.error('Error fetching group members:', membersError)
      throw membersError
    }

    if (!groupMembers || groupMembers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Group "${groupName}" has no members`,
          reminders_sent: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Found ${groupMembers.length} members in group "${groupName}"`)

    let successCount = 0
    let errorCount = 0

    // Send reminders to each member
    for (const member of groupMembers) {
      try {
        const userEmail = (member.profiles as any)?.email
        if (!userEmail) {
          console.error(`No email found for user ${member.user_id}`)
          errorCount++
          continue
        }

        // Get user's last weight entry to calculate days since last log
        const { data: lastEntry } = await supabaseAdmin
          .from('weight_entries')
          .select('created_at')
          .eq('user_id', member.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const daysSinceLastEntry = lastEntry 
          ? Math.floor((new Date().getTime() - new Date(lastEntry.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999 // Never logged

        const reminderUser: ReminderUser = {
          user_id: member.user_id,
          user_email: userEmail,
          user_display_name: member.display_name,
          group_id: groupData.id,
          group_name: groupData.name,
          days_since_last_entry: daysSinceLastEntry,
          last_reminder_sent: null
        }

        // Create personalized email content
        const emailSubject = `Weight logging reminder - ${groupData.name}`
        const emailBody = createReminderEmailBody(reminderUser)

        // Send email
        const emailSent = await sendReminderEmail(userEmail, emailSubject, emailBody)

        // Log the reminder attempt
        const { error: logError } = await supabaseAdmin
          .rpc('log_reminder_sent', {
            p_user_id: member.user_id,
            p_group_id: groupData.id,
            p_reminder_type: 'weight_logging',
            p_email_sent: emailSent
          })

        if (logError) {
          console.error('Error logging reminder:', logError)
          errorCount++
        } else {
          console.log(`Reminder sent to ${userEmail} (${member.display_name})`)
          successCount++
        }

      } catch (error) {
        console.error(`Error sending reminder to member ${member.user_id}:`, error)
        errorCount++
        
        // Still log the failed attempt
        await supabaseAdmin
          .rpc('log_reminder_sent', {
            p_user_id: member.user_id,
            p_group_id: groupData.id,
            p_reminder_type: 'weight_logging',
            p_email_sent: false
          })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reminders sent to all members of group "${groupName}"`,
        group_id: groupData.id,
        total_members: groupMembers.length,
        reminders_sent: successCount,
        errors: errorCount,
        debug_info: {
          email_service_status: Deno.env.get('RESEND_API_KEY') ? 'CONFIGURED' : 'NOT CONFIGURED'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-group-specific-reminders function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
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
          <h1 style="color: white; margin: 0; font-size: 24px;">📊 Weight Tracker Reminder</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Stay on track with your fitness goals!</p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0;">Hi ${user.user_display_name}! 👋</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
            ${daysText} in your <strong>${user.group_name}</strong> group.
          </p>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
            This is a special reminder sent to all members of your group to encourage everyone to stay active with their weight tracking.
          </p>
          <p style="color: #4b5563; line-height: 1.6; margin: 0;">
            Regular tracking helps you stay motivated and see your progress over time. Your group members are counting on your participation! 💪
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" 
             style="background: linear-gradient(135deg, #8B5CF6 0%, #10B981 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
            🎯 Log Your Weight Now
          </a>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px; text-align: center;">
            <strong>🔥 Group Challenge:</strong> Let's get everyone in ${user.group_name} to log their progress this week!
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            You're receiving this because you're a member of the <strong>${user.group_name}</strong> group.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
            This reminder was sent to all group members to encourage participation.
          </p>
        </div>
      </body>
    </html>
  `
}

async function sendReminderEmail(email: string, subject: string, body: string): Promise<boolean> {
  try {
    // Wait 2 seconds before sending the email
    console.log(`⏳ Waiting 2 seconds before sending email to ${email}...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
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