import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Only handle the homepage here to keep middleware fast elsewhere
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  // Use same fallbacks as the client-side supabase to avoid env drift in dev
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zvxyijvtoyxqwfqhyobz.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2eHlpanZ0b3l4cXdmcWh5b2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzM2OTYsImV4cCI6MjA3MDQwOTY5Nn0.7tmEptJOAvNDPwWGrHzadvm3uXP3mrqYmmDahjH6EPg';

  // Create the Supabase client for the middleware.
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          // Read the cookies from the original request
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Pass the cookies to the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (if needed) and then check user
  await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  // If a user exists AND the path is the homepage, redirect them.
  if (user && request.nextUrl.pathname === '/') {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
    // Forward any refreshed auth cookies to the redirect response
    response.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value);
    });
    return redirectResponse;
  }

  // Otherwise, continue to the requested page.
  return response;
}

export const config = {
  matcher: ['/'],
};
