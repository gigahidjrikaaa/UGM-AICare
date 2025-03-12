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
          // Restrict to UGM domain
          hd: allowedDomains,
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
    // Allow only UGM email domains
    if (account?.provider === "google") {;
      return allowedDomains.some(domain => profile?.email?.endsWith(`@${domain}`)) ?? false;
    }
      return true;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  }
});

export { handler as GET, handler as POST };