import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { v4 as uuidv4 } from 'uuid';

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
    async signIn({ user, account }) {
      console.log('signIn callback triggered', { user, account });

      if (!user.email) {
        console.error('No email provided by OAuth provider');
        return false;
      }

      try {
        // Generate a UUID for the user
        user.id = uuidv4();
        console.log('User assigned mock ID:', user.id);

        // In a real implementation, we would save this to the database
        // The DB functionality will be added when deployed to production
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback', { url, baseUrl });
      // Always redirect to home page after sign-in or sign-out
      return '/';
    },
    async session({ session, token }) {
      console.log('Session callback', { session, token });
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      console.log('JWT callback', { token, user });
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});
