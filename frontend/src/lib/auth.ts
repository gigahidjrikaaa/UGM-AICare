import { NextAuthOptions } from "next-auth";
// import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Augment the NextAuth types to include custom properties
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string | null;
      role?: string | null;
      wallet_address?: string | null;
      allow_email_checkins?: boolean | null;
    } & User; // Keep existing User properties
  }

  interface User { // Used in GoogleProvider profile and CredentialsProvider authorize
    role?: string | null;
    accessToken?: string; // For GoogleProvider profile
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    wallet_address?: string | null;
    allow_email_checkins?: boolean;
    dbUserId?: number; // If you store DB user ID in token
  }
}

// Interface for the response from GET /internal/user-by-sub
interface InternalUserResponse {
  id: number; // DB Primary Key
  google_sub: string;
  email?: string | null;
  wallet_address?: string | null;
  role?: string | null; // If backend provides role
  allow_email_checkins?: boolean; // For email check-in feature
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  
  // Configure cookies for local development
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 900, // 15 minutes
      },
    },
  },
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        // console.log("Google Profile received:", profile); // Debug log
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          accessToken: profile.access_token,
          role: profile.email?.endsWith("@ugm.ac.id") ? "user" : "guest",
        };
      }
    }),

    // Add a credentials provider for admin login
    CredentialsProvider({
      id: "admin-login",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // On the server, prefer the internal URL for container-to-container communication.
        // Fall back to the public URL for other environments (e.g., local development without Docker).
        const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;

        try {
          // This endpoint is an example, adjust it to your actual admin login endpoint.
          const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
              username: credentials?.email,
              password: credentials?.password,
            }),
            headers: { "Content-Type": "application/json" }
          });

          const user = await res.json();

          if (res.ok && user) {
            return user;
          }
          return null;
        } catch (e) {
          console.error("Authorize error:", e);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 1 * 24 * 60 * 60, // 1 days
  },
  callbacks: {
    // The jwt callback is invoked when a JWT is created or updated.
    async jwt({ token, user, account, profile }) {   // Add trigger if needed
      // On the server, prefer the internal URL for container-to-container communication.
      // Fall back to the public URL for other environments.
      const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
      const internalApiKey = process.env.INTERNAL_API_KEY;

      // Handle admin user sign-in specifically
      if (account?.provider === 'admin-login' && user?.role === 'admin') {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        // console.log("JWT Callback: Admin user signed in. Token populated:", token);
        return token; // Return early, no backend sync needed for admin
      }

      const isSignIn = !!(account && user);

      // This block handles the initial sign-in for Google users.
      // It syncs them with the backend and fetches their full profile.
      if (isSignIn && account?.provider === 'google' && profile) {
        // This block is for initial Google sign-in
        token.accessToken = account.access_token;
        token.id = user.id; // Google 'sub'
        token.role = user.role ?? undefined; // Role from GoogleProvider profile
        token.email = user.email; // Email from user object
        
        console.log(`JWT: Initial Google sign-in for user ${token.id?.substring(0, 10)}...`);

        try {
          if (!internalApiKey) {
            console.error("JWT Error: INTERNAL_API_KEY missing for backend sync.");
          } else if (!token.id) {
            console.error("JWT Error: User Sub/ID missing, cannot sync.");
          } else {
            const syncPayload = {
              google_sub: token.id,
              email: token.email
            };
            console.log("SYNC: Calling backend to sync-user...");
            const syncResponse = await fetch(`${apiUrl}/api/v1/internal/sync-user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-API-Key': internalApiKey,
              },
              body: JSON.stringify(syncPayload),
            });
            
            if (!syncResponse.ok) {
              const errorBody = await syncResponse.text();
              console.error(`JWT Error: Backend sync failed! Status: ${syncResponse.status}, Body: ${errorBody}`);
              // If sync fails, set default values.
              token.wallet_address = null;
              token.allow_email_checkins = true;
            } else {
              const syncResult = await syncResponse.json();
              console.log("SYNC: Backend sync successful.");
              token.dbUserId = syncResult.user_id;

              // AFTER successful sync, fetch the full user profile from backend
              console.log(`JWT: Fetching updated profile from backend...`);
              const profileResponse = await fetch(`${apiUrl}/api/v1/internal/user-by-sub/${token.id}`, {
                headers: { 'X-Internal-API-Key': internalApiKey },
              });

              if (profileResponse.ok) {
                const dbUserData: InternalUserResponse = await profileResponse.json();
                console.log("JWT: Received profile data post-sync.");
                token.wallet_address = dbUserData.wallet_address ?? null;
                token.allow_email_checkins = dbUserData.allow_email_checkins ?? true;
              } else {
                const errorBody = await profileResponse.text();
                console.error(`JWT Error: Fetching profile post-sync failed: ${profileResponse.status} ${errorBody}`);
                token.wallet_address = null;
                token.allow_email_checkins = true; // Default on error
              }
            }
          }
        } catch (error) {
          console.error("JWT Error: Network or other error during backend Google user sync/fetch:", error);
          token.wallet_address = null;
          token.allow_email_checkins = true; // Default on error
        }
      }
      
      // The redundant block that was causing the confusing logs has been removed.
      // The logic is now consolidated into the initial sign-in block above.
      return token;
    },

    // The session callback is invoked when a session is checked.
    async session({ session, token }) {
      // Send properties to the client, like role, accessToken, and wallet_address.
      if (token) {
        session.accessToken = token.accessToken as string | undefined;
        session.user.id = token.id as string; 
        session.user.role = token.role as string | undefined;
        session.user.wallet_address = token.wallet_address as string | null | undefined;
        session.user.allow_email_checkins = token.allow_email_checkins as boolean | undefined;
        // console.log("Session Callback: Populating session from token:", session.user.role, session.user.id?.substring(0,10));
      }
      return session;
   },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
};