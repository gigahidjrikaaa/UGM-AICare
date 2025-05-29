import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google'
import ClientProvider from "@/components/auth/ClientProvider";
import { Suspense } from "react";
import GlobalSkeleton from "@/components/ui/GlobalSkeleton";
import { Toaster } from "react-hot-toast";
// AppLayout import is removed from here

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UGM-AICare: Aika - Mental Health Assistant',
  description: "A supportive mental health AI assistant developed by UGM-AICare team.",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  }
};
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
  
  console.log("--- Environment Variable Check (Layout) ---");
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`LAYOUT: ${varName} is UNDEFINED.`);
    } else if (value === "") {
      console.warn(`LAYOUT: ${varName} is an EMPTY STRING.`);
    } else {
      // For sensitive values, you might want to just log that it's set, not the value itself
      // For NEXTAUTH_URL, logging the value is fine for this debugging.
      if (varName === 'NEXTAUTH_URL' || varName === 'NEXT_PUBLIC_API_URL') {
        console.log(`LAYOUT: ${varName} is SET to: "${value}"`);
      } else {
        console.log(`LAYOUT: ${varName} is SET (value hidden for security).`);
      }
    }
  });
  console.log("--- End Environment Variable Check (Layout) ---");
};

// Execute environment variable check when the module loads
if(process.env.APP_ENV !== 'production') {
  checkEnvVariables();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={inter.className}
      >
        <ClientProvider>
          <div className="flex flex-col min-h-screen h-full">
              <Suspense fallback={<GlobalSkeleton />}>
                {/* AppLayout is removed from here, children are rendered directly */}
                {children}
                <Toaster
                  position="top-right"
                  reverseOrder={false}
                  toastOptions={{
                    className: 'bg-white text-black dark:bg-gray-800 dark:text-white',
                    duration: 5000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    error: {
                      duration: 5000,
                      style: {
                        background: '#f44336',
                        color: '#fff',
                      },
                    },
                    success: {
                      duration: 5000,
                      style: {
                        background: '#4caf50',
                        color: '#fff',
                      },
                    },
                  }}
                />
              </Suspense>
          </div>
        </ClientProvider>
      </body>
    </html>
  );
}