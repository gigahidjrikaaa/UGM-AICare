import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedDomains = ["ugm.ac.id", "mail.ugm.ac.id", "ugm.id", "365.ugm.ac.id", "ugm.ac.id.mail.onmicrosoft.com"];

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          hd: allowedDomains,
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return allowedDomains.some(domain => profile.email?.endsWith(domain));
      }
      return true;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      // If user object exists (during sign in), add its ID to the JWT token
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  }
});

export { handler as GET, handler as POST };