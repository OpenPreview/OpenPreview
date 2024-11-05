import { Database } from '@openpreview/supabase'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, app: 'web' | 'dashboard') {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (app === 'dashboard') {
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/register') &&
      !request.nextUrl.pathname.startsWith('/auth/confirm') &&
      !request.nextUrl.pathname.startsWith('/forgot-password')
    ) {
      // no user, potentially respond by redirecting the user to the login page
      const url = request.nextUrl.clone()
      const next = request.nextUrl.pathname
      url.pathname = '/login'
      url.searchParams.set('next', next)
      return NextResponse.redirect(url)
    } else if (user) {
      const url = request.nextUrl.clone()
      const { data: userObj, error } = await supabase.from('users').select('*').eq('id', user.id).single()

      if (['/login', '/register', '/forgot-password'].includes(request.nextUrl.pathname)) {
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
      if (!userObj?.onboarding_completed && request.nextUrl.pathname !== '/onboarding' && request.nextUrl.pathname !== '/accept-org-invitation') {
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      if (userObj?.onboarding_completed && request.nextUrl.pathname === '/onboarding') {
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      return supabaseResponse
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}