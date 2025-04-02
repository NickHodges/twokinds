import { defineConfig } from 'auth-astro';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { db, Users, eq } from 'astro:db';
import type { DBUser } from './src/types/db';
import { createLogger } from './src/utils/logger';

const logger = createLogger('AuthConfig');

// Log the environment variables to verify they are loaded
logger.info('Attempting to load Google Credentials:');
logger.info(`GOOGLE_CLIENT_ID: ${import.meta.env.GOOGLE_CLIENT_ID?.substring(0, 10)}...`); // Log first 10 chars for verification
logger.info(`GOOGLE_CLIENT_SECRET: ${import.meta.env.GOOGLE_CLIENT_SECRET?.substring(0, 5)}...`); // Log first 5 chars

async function getDbUser(email: string): Promise<DBUser | undefined> {
  if (!email) return undefined;
  try {
    return await db.select().from(Users).where(eq(Users.email, email)).get();
  } catch (error) {
    logger.error('Error fetching DB user:', error);
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
  debug: process.env.NODE_ENV !== 'production',
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      logger.info('signIn callback triggered', {
        userEmail: user.email,
        provider: account?.provider,
      });
      if (!user.email) {
        logger.error('No email found for user during sign in.');
        return false;
      }

      try {
        const dbUser = await getDbUser(user.email);

        if (dbUser) {
          await db
            .update(Users)
            .set({
              lastLogin: new Date(),
              updatedAt: new Date(),
              image: user.image ?? dbUser.image,
            })
            .where(eq(Users.id, dbUser.id));
          logger.info(`Existing user ${user.email} signed in.`);
        } else {
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
              role: 'user',
              preferences: {},
            })
            .returning({ id: Users.id });

          if (!newUserResult || newUserResult.length === 0) {
            logger.error('Failed to create new user in DB for:', user.email);
            return false;
          }
          logger.info(`New user ${user.email} created with ID ${newUserResult[0].id}.`);
        }
        return true;
      } catch (error) {
        logger.error('Error during signIn DB operations:', error);
        return false;
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
          logger.error('JWT Callback: DB User not found for:', user.email);
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
        logger.warn('Session Callback: Token or session.user missing/incomplete', {
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
