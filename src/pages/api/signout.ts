import type { APIRoute } from 'astro';
import { auth } from '../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Call Better Auth's sign out API
    await auth.api.signOut({
      headers: request.headers,
    });

    // Clear any session cookies
    cookies.delete('better-auth.session_token', { path: '/' });

    // Redirect to home page after successful sign-out
    return redirect('/', 302);
  } catch (error) {
    console.error('Sign-out error:', error);
    // On error, redirect back with error message
    return redirect('/?error=signout-failed', 302);
  }
};
