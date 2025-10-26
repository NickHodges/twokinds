import type { APIRoute } from 'astro';
import { auth } from '../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Call Better Auth's sign out API
    await auth.api.signOut({
      headers: request.headers,
    });

    // Clear any session cookies
    cookies.delete('better-auth.session_token', { path: '/' });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Sign-out error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Sign-out failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
