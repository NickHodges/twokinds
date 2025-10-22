import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { db, Users, eq } from 'astro:db';
import {
  AUTH_SECRET,
  AUTH_TRUST_HOST,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from 'astro:env/server';

// Determine environment using vite's import.meta.env for consistency
const isDevelopment = import.meta.env.DEV;

export default defineConfig({
  providers: [
    GitHub({
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: AUTH_SECRET,
  trustHost: AUTH_TRUST_HOST,
  debug: isDevelopment, // Only enable debug in development
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
      if (!user.email) {
        return false;
      }

      try {
        // Check if user exists
        const existingUser = await db.select().from(Users).where(eq(Users.email, user.email)).get();

        if (!existingUser) {
          // Create new user with auto-incrementing ID
          const now = new Date();

          const newUser = await db
            .insert(Users)
            .values({
              name: user.name || '',
              email: user.email,
              provider: account?.provider || 'unknown',
              lastLogin: now,
              createdAt: now,
              updatedAt: now,
              role: 'user',
              preferences: {},
            })
            .returning()
            .get();

          if (!newUser) {
            return false;
          }

          user.id = String(newUser.id);
        } else {
          // Update existing user's last login
          await db
            .update(Users)
            .set({
              lastLogin: new Date(),
              name: user.name || existingUser.name,
              updatedAt: new Date(),
            })
            .where(eq(Users.id, existingUser.id))
            .run();

          user.id = String(existingUser.id);
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      // Check specific URLs and handle them
      if (url.startsWith(`${baseUrl}/dashboard`)) {
        return `${baseUrl}/dashboard`;
      }
      // Default redirect to home page
      return '/';
    },
    async session({ session, token }) {
      // Ensure the user ID is included in the session
      session.user = {
        ...session.user,
        id: token.id ? String(token.id) : '',
      };

      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = String(user.id);
      }

      return token;
    },
  },
});
