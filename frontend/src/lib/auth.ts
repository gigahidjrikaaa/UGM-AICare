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
                id: "admin-user" + credentials?.email, // Use a distinct ID for admin
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
    async jwt({ token, user, account, profile }) {   // Add trigger if needed
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
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

      // Existing logic for Google users and other general token updates
      const isSignIn = !!(account && user);
      // Determine if wallet/profile data needs fetching/refreshing
      // For Google users, fetch on sign-in or if data is missing.
      // Avoid fetching if role is already admin (covered by the block above)
      const needsBackendDataFetch = token.role !== 'admin' && (isSignIn || !token.wallet_address);

      if (isSignIn && account?.provider === 'google' && profile) {
        // This block is for initial Google sign-in
        token.accessToken = account.access_token;
        token.id = user.id; // Google 'sub'
        token.role = user.role ?? undefined; // Role from GoogleProvider profile
        token.email = user.email; // Email from user object
        
        // console.log(`JWT: Initial Google sign-in for user ${token.id?.substring(0, 10)}... Role: ${token.role}, Email: ${token.email}`);

        try {
          if (!internalApiKey) {
            console.error("JWT Error: INTERNAL_API_KEY missing for backend sync.");
          } else if (!token.id) {
            console.error("JWT Error: User Sub/ID missing, cannot sync.");
          } else {
            // console.log(`JWT: Calling internal sync for Google user sub ${token.id.substring(0, 10)}...`);
            const syncPayload = {
              google_sub: token.id,
              email: token.email
            };
            console.log("SYNC: Calling backend sync-user", backendUrl, syncPayload, internalApiKey);
            const syncResponse = await fetch(`${backendUrl}/api/v1/internal/sync-user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-API-Key': internalApiKey,
              },
              body: JSON.stringify(syncPayload),
            });
            console.log("SYNC: Sync-user response status", syncResponse.status);

            if (!syncResponse.ok) {
              const errorBody = await syncResponse.text();
              console.error(`JWT Error: Backend sync failed for Google user! Status: ${syncResponse.status}, Body: ${errorBody}`);
            } else {
              const syncResult = await syncResponse.json();
              // console.log("JWT: Backend Google user sync successful:", syncResult);
              token.dbUserId = syncResult.user_id;

              // AFTER successful sync, fetch the full user profile from backend
              // console.log(`JWT: Fetching updated profile from backend for Google user sub ${token.id.substring(0, 10)}...`);
              const profileResponse = await fetch(`${backendUrl}/api/v1/internal/user-by-sub/${token.id}`, {
                headers: { 'X-Internal-API-Key': internalApiKey },
              });

              if (profileResponse.ok) {
                const dbUserData: InternalUserResponse = await profileResponse.json();
                // console.log("JWT: Received profile data post-sync for Google user:", dbUserData);
                token.wallet_address = dbUserData.wallet_address ?? null;
                token.allow_email_checkins = dbUserData.allow_email_checkins ?? true;
              } else {
                const errorBody = await profileResponse.text();
                console.error(`JWT Error: Fetching profile post-sync for Google user failed: ${profileResponse.status} ${errorBody}`);
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
      
      // This block fetches/refreshes wallet data for non-admin users on subsequent requests if needed
      if (token.id && needsBackendDataFetch && account?.provider !== 'admin-login') {
        // console.log(`JWT: Fetching/Refreshing wallet data from internal API for non-admin user: ${token.id.substring(0, 10)}...`);
        try {
          const internalApiUrl = `${backendUrl}/api/v1/internal/user-by-sub/${token.id}`;
          // internalApiKey is already defined above

          if (!internalApiKey) {
            console.error("JWT Error: INTERNAL_API_KEY missing for wallet fetch.");
          } else {
            const response = await fetch(internalApiUrl, {
              headers: { 'X-Internal-API-Key': internalApiKey },
            });

            if (!response.ok) {
              if (response.status === 404) {
                console.warn(`JWT: User sub ${token.id} not found in backend DB during wallet fetch (non-admin).`);
                token.wallet_address = null;
                token.allow_email_checkins = true; // Default if user not found
              } else {
                 const errorBody = await response.text();
                 console.error(`JWT Error: Internal API wallet fetch failed (non-admin): ${response.status} ${errorBody}`);
              }
            } else {
              const dbUserData: InternalUserResponse = await response.json();
              // console.log("JWT: Received wallet data from internal API (non-admin):", dbUserData);
              token.wallet_address = dbUserData.wallet_address ?? null;
              token.allow_email_checkins = dbUserData.allow_email_checkins ?? true;
            }
          }
        } catch (error) {
          console.error("JWT Error: Network or other error during wallet data fetch (non-admin):", error);
          token.wallet_address = null;
          token.allow_email_checkins = true; // Default on error
        }
      }
      return token;
    },

    // The redirect callback is invoked whenever a redirect is triggered.
    async redirect({ url, baseUrl }) {
      // For admin login, redirect to admin dashboard
      if (url.startsWith("/api/auth/callback/admin-login")) {
        return `${baseUrl}/admin/dashboard`;
      }

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
        return `${baseUrl}${url}`;
      }
      return url;
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