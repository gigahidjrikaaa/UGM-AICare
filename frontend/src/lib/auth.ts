import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
// import { Session } from "next-auth";

// Extend the Session type to include custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
      accessToken?: string;
      role?: string;
    };
    jwt?: string; // Optional JWT property
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          sub: profile.sub,
          accessToken: profile.access_token,
          role: "user" // Default role for Google users
        };
      }
    }),

    // Add a credentials provider for admin login
    Credentials({
      id: "admin-login",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // This is where you'd validate against your admin database
        // For now, we'll use a simple check with environment variables
        if (
          credentials.email === "admin@ugm.ac.id" &&
          credentials.password === "admin"
        ) {
          return {
            id: "admin",
            email: credentials.email,
            name: "Admin User",
            image: undefined,
            role: "admin"
          };

        // In a real implementation, you'd check your database:
        // const admin = await db.admin.findUnique({
        //   where: { email: credentials.email }
        // });
        // 
        // if (admin && await comparePasswords(credentials.password, admin.password)) {
        //   return {
        //     id: admin.id,
        //     email: admin.email,
        //     name: admin.name,
        //     role: "admin"
        //   };
        // }
        }
        return null;
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 3 * 24 * 60 * 60, // 1 days
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // For admin login, redirect to admin dashboard
      if (url.startsWith("/api/auth/callback/admin-login")) {
        return `${baseUrl}/admin/dashboard`;
      }

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
      if (session?.user && token.id) {
        session.user.id = token.sub as string;
        session.user.accessToken = token.accessToken as string;
        session.user.role = token.role as string; // Add role to session
        session.jwt = JSON.stringify(token); // Convert token object to string
      }
      return session;
    },
    async jwt({ token, account, user }) {
      // Add user info to token
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id;
        // Check if role property exists before assigning
        if ('role' in user) {
          token.role = (user as { role: string }).role;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
};