import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';

export default defineConfig({
  providers: [
    GitHub({
      clientId: import.meta.env.GITHUB_CLIENT_ID,
      clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: import.meta.env.AUTH_SECRET,
  trustHost: import.meta.env.AUTH_TRUST_HOST ?? true,
  debug: process.env.NODE_ENV !== 'production', // Only enable debug in development
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // 1 hour instead of the default 30 days
  },
  pages: {
    signIn: '/auth/signin', // Custom sign-in page
    error: '/auth/error', // Custom error page
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('JWT callback', { token, user, account });

      // If this is a sign-in, user will be provided
      if (user) {
        token.id = user.id;
      }

      // If no ID in token but we have a sub, use that
      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      return token;
    },

    async session({ session, token }) {
      console.log('Session callback', { session, token });

      if (session.user) {
        // Ensure we always have an ID - use token.id or token.sub
        session.user.id = token.id || token.sub;
      }

      return session;
    },
  },
});
