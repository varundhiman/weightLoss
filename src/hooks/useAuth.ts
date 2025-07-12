import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, displayName: string, height: number) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          height: height.toString()
        }
      }
    })

    // If sign up was successful, create the profile immediately
    if (data.user && !error) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: displayName,
          height: height
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        return { data, error: profileError }
      }
    }

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    const result = await supabase.auth.signOut();

    if (result.error) {
      await supabase.auth._removeSession()
      await supabase.auth._notifyAllSubscribers('SIGNED_OUT', null)
      return null
    }
    return result
  }

  const resetPassword = async (email: string) => {
    // Always use the production URL for password reset emails
    const baseUrl = 'https://glowing-cobbler-be0e91.netlify.app'
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`
    })
    return { data, error }
  }
  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  }
}