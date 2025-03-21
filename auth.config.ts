import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { db, Users, eq } from 'astro:db';
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
        // Check if user exists
        const existingUser = await db.select().from(Users).where(eq(Users.email, user.email)).get();

        if (!existingUser) {
          // Create new user with a UUID
          const now = new Date();
          const userId = uuidv4(); // Generate a new UUID
          console.log('Creating new user with ID:', userId);

          const newUser = await db
            .insert(Users)
            .values({
              id: userId,
              name: user.name || '',
              email: user.email,
              image: user.image || '',
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
            console.error('Failed to create new user');
            return false;
          }

          user.id = newUser.id;
          console.log('New user created successfully:', newUser.id);
        } else {
          // Update existing user's last login
          console.log('Updating existing user:', existingUser.id);
          await db
            .update(Users)
            .set({
              lastLogin: new Date(),
              name: user.name || existingUser.name,
              image: user.image || existingUser.image,
            })
            .where(eq(Users.id, existingUser.id))
            .run();

          user.id = existingUser.id;
          console.log('User updated successfully:', existingUser.id);
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback', { url, baseUrl });
      // Handle redirect to the requested URL if available
      if (url.startsWith(baseUrl)) return url;
      // Otherwise, redirect to home
      return baseUrl;
    },
    async jwt({ token, user, account }) {
      console.log('JWT callback', { token, user, account });

      // If this is a sign-in, user will be provided
      if (user?.id) {
        token.id = user.id;
      } else if (token.sub) {
        // If we don't have a user ID but we have a sub, use that as ID
        token.id = token.sub;

        // If we have email, try to find the user in the database
        if (token.email) {
          try {
            const dbUser = await db.select().from(Users).where(eq(Users.email, token.email)).get();
            if (dbUser) {
              token.id = dbUser.id;
              console.log('Found user ID from database:', dbUser.id);
            }
          } catch (error) {
            console.error('Error finding user by email:', error);
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      console.log('Session callback', { session, token });

      if (session.user) {
        // Ensure we always have an ID - use token.id or token.sub
        session.user.id = token.id || token.sub;

        // If we still don't have an ID but we have an email, try to get from DB
        if (!session.user.id && session.user.email) {
          try {
            const dbUser = await db
              .select()
              .from(Users)
              .where(eq(Users.email, session.user.email))
              .get();
            if (dbUser) {
              session.user.id = dbUser.id;
              console.log('Set user ID from database:', dbUser.id);
            }
          } catch (error) {
            console.error('Error finding user by email:', error);
          }
        }

        console.log('Final session user ID:', session.user.id);
      }

      return session;
    },
  },
});
