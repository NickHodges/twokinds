import type { APIRoute } from 'astro';
import { auth } from '../../../../lib/auth';
import { createLogger } from '../../../../utils/logger';

const logger = createLogger('SocialSignIn');

export const POST: APIRoute = async (context) => {
  try {
    const { request } = context;
    const formData = await request.formData();
    const provider = formData.get('provider') as string;
    const callbackURL = (formData.get('callbackURL') as string) || '/';

    logger.info('Social sign-in attempt', { provider, callbackURL });

    if (!provider) {
      logger.warn('Missing provider in sign-in request');
      return new Response(null, {
        status: 302,
        headers: { Location: '/auth/signin?error=missing-provider' },
      });
    }

    // Create a new request with JSON body for Better Auth
    // Copy all important headers from the original request
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    // Copy essential headers from original request
    const importantHeaders = ['Cookie', 'Origin', 'Referer', 'User-Agent', 'Host'];
    importantHeaders.forEach((header) => {
      const value = request.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    const apiRequest = new Request(request.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        provider,
        callbackURL,
      }),
    });

    // Call Better Auth's handler
    const authResponse = await auth.handler(apiRequest);

    // Clone the response so we can read it multiple times
    const clonedResponse = authResponse.clone();

    // If Better Auth returns JSON with a URL, we need to:
    // 1. Extract the URL
    // 2. Create a redirect response
    // 3. Copy ALL Set-Cookie headers from Better Auth
    if (authResponse.headers.get('content-type')?.includes('application/json')) {
      const data = await authResponse.json();

      if (data && typeof data === 'object' && 'url' in data) {
        logger.info('Redirecting to OAuth provider', { url: data.url });

        // Create redirect response
        const redirectResponse = new Response(null, {
          status: 302,
          headers: {
            Location: data.url as string,
          },
        });

        // Copy EVERY Set-Cookie header from Better Auth response
        for (const [key, value] of clonedResponse.headers.entries()) {
          if (key.toLowerCase() === 'set-cookie') {
            redirectResponse.headers.append('Set-Cookie', value);
          }
        }

        return redirectResponse;
      }
    }

    logger.info('Passing through auth response', { status: authResponse.status });

    // If Better Auth already returned a redirect, pass it through completely
    return clonedResponse;
  } catch (error) {
    logger.error('Sign-in error', { error });
    return new Response(null, {
      status: 302,
      headers: { Location: '/auth/signin?error=auth-error' },
    });
  }
};
