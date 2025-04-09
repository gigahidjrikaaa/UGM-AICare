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

interface InternalUserResponse {
  id: number; // DB Primary Key
  google_sub: string;
  email?: string | null;
  wallet_address?: string | null;
  role?: string | null; // If backend provides role
}

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
          wallet_address: null,
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
      const isSignIn = account && user; // Check if this is a sign-in event
      const needsUpdate = trigger === 'signIn' || trigger === 'update' || !token.wallet_address; // Fetch on sign-in, update, or if wallet address is missing

      if (isSignIn) {
        // On initial sign-in, populate from user/account object first
        token.accessToken = account.access_token;
        token.id = user.id; // Google 'sub'
        token.role = user.role; // Role from GoogleProvider profile or Credentials
        console.log(`JWT: Initial sign-in for user ${user.id}. Role: ${user.role}`);
      }

      console.log("JWT Callback - Initial Token:", token); // Log token received
      // Fetch/Refresh DB data if necessary (on sign-in or if data missing)
      // Use token.sub (which should be same as token.id after sign-in)
      if (token.sub && needsUpdate) {
          console.log(`JWT: Fetching/Refreshing user data from internal API for sub: ${token.sub}`);
          try {
              const internalApiUrl = `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/v1/internal/user-by-sub/${token.sub}`;
              const internalApiKey = process.env.INTERNAL_API_KEY; // Get key from Next.js env

              if (!internalApiKey) {
                 console.error("JWT Error: INTERNAL_API_KEY is not configured in Next.js environment.");
                 throw new Error("Internal API Key missing");
              }

              const response = await fetch(internalApiUrl, {
                  headers: {
                      'X-Internal-API-Key': internalApiKey,
                  },
              });

              if (!response.ok) {
                  if (response.status === 404) {
                      console.warn(`JWT: User sub ${token.sub} not found in backend DB.`);
                      token.wallet_address = null; // User might exist in Auth but not DB yet
                  } else {
                      throw new Error(`Internal API request failed: ${response.status} ${response.statusText}`);
                  }
              } else {
                  const dbUserData: InternalUserResponse = await response.json();
                  console.log("JWT: Received data from internal API:", dbUserData);
                  token.wallet_address = dbUserData.wallet_address ?? null;
                  // Optionally update role if fetched from DB:
                  // if (dbUserData.role) token.role = dbUserData.role;
              }
          } catch (error) {
              console.error("JWT: Error fetching user data from internal API:", error);
              // Decide if this is critical - maybe keep existing token data?
              // Setting to null might be safer if fetch fails consistently
              if (!token.wallet_address) token.wallet_address = null;
          }
      } else if (!token.sub) {
          console.warn("JWT: No token.sub found, cannot fetch DB data.");
      }

      console.log("JWT Callback - Returning Token:", JSON.stringify(token, null, 2));
      return token;
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
      console.log("Session Callback - Received Token Object:", JSON.stringify(token, null, 2));
              
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