import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google'
import ClientProvider from "@/components/auth/ClientProvider";
// import HeaderWrapper from "@/components/ui/HeaderWrapper";
// import FooterWrapper from "@/components/ui/FooterWrapper";
import { Suspense } from "react";
import GlobalSkeleton from "@/components/ui/GlobalSkeleton";
import { Toaster } from "react-hot-toast";
import AppLayout from "@/components/layout/AppLayout";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UGM-AICare: Aika - Mental Health Assistant',
  description: "A supportive mental health AI assistant developed by UGM-AICare team.",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  }
};

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
                <AppLayout >
                  {children}
                </AppLayout>
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
