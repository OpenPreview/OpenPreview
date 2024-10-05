import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@openpreview/db/server'

// Creating a handler to a GET request to route /auth/confirm
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') || '/'

  const redirectTo = new URL(next, process.env.NEXT_PUBLIC_APP_URL)
  redirectTo.searchParams.delete('token')
  redirectTo.searchParams.delete('type')

  if (token && type) {
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: token,
      })

      if (error) throw error

      // If verification is successful, set a cookie or session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (session) {
        // Set the session in a cookie
        const response = NextResponse.redirect(redirectTo.toString())
        response.cookies.set('sb-access-token', session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        })
        response.cookies.set('sb-refresh-token', session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        })
        return response
      }
    } catch (error) {
      console.error('Error verifying OTP:', error)
    }
  }

  // If there's an error or no session, redirect to login
  redirectTo.pathname = '/login'
  return NextResponse.redirect(redirectTo.toString())
}