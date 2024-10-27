import { createClient } from '@openpreview/db/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();    
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session) {
    // User is already logged in, return HTML with script to close window and send message
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'LOGIN_SUCCESS', token: '${session.access_token}', user: '${user}' }, '*');
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } else {
    // User is not logged in, redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.session) {
    // Login successful, return HTML with script to close window and send message
    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({ type: 'LOGIN_SUCCESS', token: '${data.session.access_token}', user: '${data.user}' }, '*');
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  return NextResponse.json({ error: 'Login failed' }, { status: 400 });
}
