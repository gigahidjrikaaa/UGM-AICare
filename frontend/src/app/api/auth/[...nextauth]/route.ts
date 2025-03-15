import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Customize the redirect logic
      if (url.startsWith(baseUrl)) {
        // For absolute URLs within our app
        if (url.includes("/signin") && url.includes("callbackUrl")) {
          // Extract the callbackUrl from the URL if present
          const callbackUrl = new URL(url).searchParams.get("callbackUrl");
          if (callbackUrl) return callbackUrl;
          return `${baseUrl}/aika`;
        }
        return url;
      } else if (url.startsWith("/")) {
        // For relative URLs
        return `${baseUrl}${url}`;
      }
      return url;
    },
    async session({ session, token }) {
      // Add user ID to session from token
      if (session?.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, account, user }) {
      // Add user info to token
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/signin',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };