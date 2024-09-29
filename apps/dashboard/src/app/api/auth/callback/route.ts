import { createClient } from '@lib/server'
import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('next')
  const redirectURL = redirect
    ? process.env.NEXT_PUBLIC_APP_URL! + redirect
    : null

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        {
          // a 301 status is required to redirect from a POST to a GET route
          status: 301,
        }
      )
    }
  }
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(redirectURL ?? process.env.NEXT_PUBLIC_APP_URL!)
}
