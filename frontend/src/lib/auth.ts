import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
// import { Session } from "next-auth";

// Environment variables type checking
const checkEnvVariables = () => {
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_URL'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );
  
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}. Please check your .env file.`
    );
  }
};

// Execute environment variable check
checkEnvVariables();

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        console.log("Google Profile received:", profile); // Debug log
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          sub: profile.sub,
          accessToken: profile.access_token,
          role: profile.email?.endsWith("@ugm.ac.id") ? "user" : "guest", // Example: Assign role based on emai
          wallet_address: null // Initialize wallet_address as null
        };
      }
    }),

    // Add a credentials provider for admin login
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Attempting Admin Login:", credentials?.email); // Log attempt, but not password
            if (
              credentials?.email === process.env.ADMIN_EMAIL && // Use env vars for admin credentials
              credentials?.password === process.env.ADMIN_PASSWORD
            ) {
              console.log("Admin Login Successful:", credentials?.email);
              return { // Return the Admin User object
                id: "admin-user", // Use a distinct ID for admin
                email: credentials?.email,
                name: "Administrator",
                role: "admin" // Assign the 'admin' role
              };
            }
            console.warn("Admin Login Failed:", credentials?.email);
            return null; // Login failed
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 1 * 24 * 60 * 60, // 1 days
  },
  callbacks: {
    // The jwt callback is invoked when a JWT is created or updated.
    async jwt({ token, user, account, trigger }) {
      console.log("JWT Callback Trigger:", trigger); // Log trigger type
      console.log("JWT Callback - Initial Token:", token); // Log token received
      // Persist the OAuth access_token and user role to the token right after sign-in
      if (account && user) {
        console.log("JWT Callback: Sign-in/Update - Adding info to token");
        token.accessToken = account.access_token; // Store access token from provider
        token.id = user.id;                  // Store user ID (consistent with session)
        token.role = user.role;              // Store user role
        if (user.wallet_address) {
          token.wallet_address = user.wallet_address;
          console.log("JWT: Added wallet_address from user object:", user.wallet_address);
        } else {
          console.log("JWT: No wallet_address found in user object.");
          token.wallet_address = null; // Ensure it's null if not present
        }
      }
      console.log("JWT Callback - Final Token Object:", token);
      return token; // The token object will be encrypted and stored in a cookie
    },

    // The redirect callback is invoked whenever a redirect is triggered.
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

    // The session callback is invoked when a session is checked.
    async session({ session, token }) {
      console.log("Session Callback - Received Token Object:", token);
     
      // Assign user info from the token object to the session object
      if (session.user && token.sub) { // Use token.sub for ID consistency
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.accessToken = token.accessToken; // Pass if needed client-side
        session.user.wallet_address = token.wallet_address ?? null;
      }
      
      console.log("Session Callback - Final Session Object:", session);
      return session; // The session object is returned to the client
   },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
};