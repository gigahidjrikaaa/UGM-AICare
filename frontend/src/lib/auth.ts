import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Environment variables type checking
const checkEnvVariables = () => {
  const requiredEnvVars = [
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_URL',
    'INTERNAL_API_KEY',
    'NEXT_PUBLIC_API_URL',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );
  
  if (missingEnvVars.length > 0) {
    console.error(
      `Missing recommended environment variables: ${missingEnvVars.join(', ')}. Some features might fail.`
    );
  }
};

// Execute environment variable check
checkEnvVariables();

// Interface for the response from GET /internal/user-by-sub
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
    async jwt({ token, user, account, trigger }) {
      console.log(`JWT Callback Trigger: ${trigger}, User Present: ${!!user}, Account Present: ${!!account}`);
      const isSignIn = !!(account && user); // Check if this is a sign-in event
      const needsWalletUpdate  = isSignIn || !token.wallet_address; // Fetch on sign-in, update, or if wallet address is missing

      if (isSignIn) {
        // On initial sign-in, populate from user/account object first
        token.accessToken = account.access_token;
        token.id = user.id; // Google 'sub'
        token.role = user.role; // Role from GoogleProvider profile or Credentials
        token.email = user.email; // Email from user object

        console.log(`JWT: Initial sign-in for user ${token.id?.substring(0, 10)}... Role: ${token.role}, Email: ${token.email}`);

        // --- !! Call Backend to Sync User !! ---
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
          const internalApiKey = process.env.INTERNAL_API_KEY;

          if (!internalApiKey) {
            console.error("JWT Error: INTERNAL_API_KEY missing for backend sync.");
          } else if (!token.id) {
            console.error("JWT Error: User Sub/ID missing, cannot sync.");
          } else {
            console.log(`JWT: Calling internal sync for user sub ${token.id.substring(0, 10)}...`);
            const syncPayload = {
              google_sub: token.id,
              email: token.email // Pass the email we got from Google profile
            };
            const syncResponse = await fetch(`${backendUrl}/api/v1/internal/sync-user`, {
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
            } else {
              const syncResult = await syncResponse.json();
              console.log("JWT: Backend user sync successful:", syncResult);
              // token.dbUserId = syncResult.user_id; // Optionally store db id
            }
          }
        } catch (error) {
          console.error("JWT Error: Network or other error during backend user sync fetch:", error);
        }
        // --- !! End Backend Sync Call !! ---
      }
      
      // This runs on sign-in AND subsequent reads if wallet isn't already in token
      // It uses the GET /user-by-sub endpoint
      // Ensure token.sub exists (it should after sign-in)
      if (token.sub && needsWalletUpdate) {
        console.log(`JWT: Fetching/Refreshing wallet data from internal API for sub: ${token.sub.substring(0, 10)}...`);
        try {
          const internalApiUrl = `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/v1/internal/user-by-sub/${token.sub}`;
          const internalApiKey = process.env.INTERNAL_API_KEY;

          if (!internalApiKey) {
            console.error("JWT Error: INTERNAL_API_KEY missing for wallet fetch.");
          } else {
            const response = await fetch(internalApiUrl, {
              headers: { 'X-Internal-API-Key': internalApiKey },
            });

            if (!response.ok) {
              if (response.status === 404) {
                console.warn(`JWT: User sub ${token.sub} not found in backend DB during wallet fetch.`);
                // If user not found here, wallet is definitely null
                token.wallet_address = null;
              } else {
                 const errorBody = await response.text();
                 console.error(`JWT Error: Internal API wallet fetch failed: ${response.status} ${errorBody}`);
              }
            } else {
              const dbUserData: InternalUserResponse = await response.json();
              console.log("JWT: Received wallet data from internal API:", dbUserData);
              token.wallet_address = dbUserData.wallet_address ?? null;
              // Optionally refresh role from DB if needed
              // if (dbUserData.role) token.role = dbUserData.role;
            }
          }
        } catch (error) {
          console.error("JWT: Network or other error fetching user data from internal API:", error);
          // Only set wallet to null if it wasn't already set
          if (token.wallet_address === undefined) token.wallet_address = null;
        }
      } else if (!token.sub) {
        console.warn("JWT: No token.sub found, cannot fetch wallet data.");
      }

      // Ensure essential fields exist even if sign-in failed partially
      token.id = token.id || token.sub;
      token.role = token.role || "guest"; // Default role

      console.log("JWT Callback - Returning Token:", token); // Log final token before return
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
      // console.log("Session Callback - Received Token:", token);
              
      // Assign user info from the token object to the session object
      if (session.user) {
        session.user.id = token.sub || token.id || "unknown"; // Ensure ID exists
        session.user.role = token.role || "guest";
        session.user.accessToken = token.accessToken; // Pass Google token if needed
        session.user.wallet_address = token.wallet_address ?? null; // Pass wallet address
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