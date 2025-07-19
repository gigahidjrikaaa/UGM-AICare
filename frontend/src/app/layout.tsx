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
    if (!value) {
      console.warn(`[ENV CHECK] Missing required environment variable: ${varName}`);
    } else {
      // For sensitive keys, just log that they are set.
      if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')) {
        console.log(`[ENV CHECK] ${varName} is set.`);
      } else {
        console.log(`[ENV CHECK] ${varName}: ${value}`);
      }
    }
  });
  console.log("------------------------------------------");
};

// Run the check only on the server during build/startup
checkEnvVariables();


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} flex flex-col h-full`}
      >
        <ClientProvider>
          <div className="flex flex-col flex-grow">
              <Suspense fallback={<GlobalSkeleton />}>
                {/* AppLayout is removed from here, children are rendered directly */}
                {children}
                <Toaster
                  position="top-right"
                  reverseOrder={false}
                  toastOptions={{
                    duration: 5000,
                    style: {
                      background: '#363636',
                      color: '#fff',
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