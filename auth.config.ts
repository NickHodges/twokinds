import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { defineConfig } from 'auth-astro';

export default defineConfig({
  providers: [
    GitHub({
      clientId: import.meta.env.GITHUB_ID,
      clientSecret: import.meta.env.GITHUB_SECRET
    }),
    Google({
      clientId: import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET
    }),
  ],
  secret: import.meta.env.AUTH_SECRET,
  trustHost: true,
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour instead of the default 30 days
  },
  pages: {
    signIn: '/auth/signin', // Custom sign-in page
  },
  callbacks: {
    async signIn() {
      return true;
    },
    async redirect({ url: _url, baseUrl: _baseUrl }) {
      // Always redirect to home page after sign-in or sign-out
      return '/';
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    }
  }
});