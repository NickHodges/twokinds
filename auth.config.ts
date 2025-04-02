import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { db, Users, eq } from 'astro:db';
import type { DBUser } from './src/types/db';

async function getDbUser(email: string): Promise<DBUser | undefined> {
  if (!email) return undefined;
  try {
    return await db.select().from(Users).where(eq(Users.email, email)).get();
  } catch (error) {
    console.error('Error fetching DB user:', error);
    return undefined;
  }
}

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
      console.log('signIn callback triggered', {
        userEmail: user.email,
        provider: account?.provider,
      });
      if (!user.email) {
        console.error('No email found for user during sign in.');
        return false; // Abort sign in
      }

      try {
        const dbUser = await getDbUser(user.email);

        if (dbUser) {
          // User exists, update last login and image if needed
          await db
            .update(Users)
            .set({
              lastLogin: new Date(),
              updatedAt: new Date(),
              image: user.image ?? dbUser.image,
            })
            .where(eq(Users.id, dbUser.id));
          console.log(`Existing user ${user.email} signed in.`);
        } else {
          // User doesn't exist, create them
          const newUserResult = await db
            .insert(Users)
            .values({
              name: user.name || '',
              email: user.email,
              image: user.image,
              provider: account?.provider || 'unknown',
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              role: 'user', // Default role
              preferences: {},
            })
            .returning({ id: Users.id }); // Only return necessary field

          if (!newUserResult || newUserResult.length === 0) {
            console.error('Failed to create new user in DB for:', user.email);
            return false; // Abort sign in
          }
          console.log(`New user ${user.email} created with ID ${newUserResult[0].id}.`);
        }
        return true; // Allow sign in
      } catch (error) {
        console.error('Error during signIn DB operations:', error);
        return false; // Prevent sign in on DB error
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await getDbUser(user.email);
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.picture = dbUser.image ?? token.picture;
        } else {
          console.error('JWT Callback: DB User not found for:', user.email);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as number;
        session.user.role = token.role as string;
        session.user.image = token.picture as string | null;
      } else {
        console.warn('Session Callback: Token or session.user missing/incomplete', {
          tokenId: token?.id,
          sessionUserExists: !!session.user,
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
