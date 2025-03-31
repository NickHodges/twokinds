import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import Credentials from '@auth/core/providers/credentials';
import { db, Users, eq } from 'astro:db';
import { AUTH_SECRET, AUTH_TRUST_HOST, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from 'astro:env/server';

// Determine environment using vite's import.meta.env for consistency
const isDevelopment = import.meta.env.DEV;

export default defineConfig({
  providers: [
    // Development Credentials Provider - only for development
    isDevelopment
    ? Credentials({
      name: 'Development Login',
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        // Create a mock user for development
        return {
          id: "1",
          name: credentials.name || "Dev User",
          email: credentials.email,
          image: "https://avatars.githubusercontent.com/u/1?v=4",
        };
      },
    })
    : null,
    GitHub({
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ].filter(Boolean),
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
      console.log('signIn callback triggered', { user, account });

      if (!user.email) {
        console.error('No email provided by OAuth provider');
        return false;
      }

      try {
        // Check if user exists
        const existingUser = await db.select().from(Users).where(eq(Users.email, user.email)).get();

        if (!existingUser) {
          // Create new user with auto-incrementing ID
          const now = new Date();
          console.log('Creating new user');

          const newUser = await db
            .insert(Users)
            .values({
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

          user.id = String(newUser.id); // Convert number to string for compatibility
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
              updatedAt: new Date(),
            })
            .where(eq(Users.id, existingUser.id))
            .run();

          user.id = String(existingUser.id); // Convert number to string for compatibility
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
      // Check specific URLs and handle them
      if (url.startsWith(`${baseUrl}/dashboard`)) {
        return `${baseUrl}/dashboard`;
      }
      // Default redirect to home page
      return '/';
    },
    async session({ session, token }) {
      console.log('Session callback before modification', { 
        sessionUserId: session?.user?.id,
        sessionUserIdType: session?.user?.id ? typeof session.user.id : null,
        tokenId: token.id,
        tokenIdType: token.id ? typeof token.id : null
      });
      
      if (session.user) {
        // Assign token ID to session user ID
        session.user.id = token.id as string;
        
        console.log('Session after modification', {
          userId: session.user.id,
          userIdType: typeof session.user.id
        });
      }
      
      return session;
    },
    async jwt({ token, user }) {
      console.log('JWT callback', { 
        tokenBefore: { ...token }, 
        user: user ? { id: user.id, idType: typeof user.id } : null 
      });
      
      if (user) {
        // Store numeric ID in JWT token
        token.id = user.id;
        
        // Log the token after modification
        console.log('JWT token after modification:', { 
          id: token.id, 
          idType: typeof token.id 
        });
      }
      
      return token;
    },
  },
});
