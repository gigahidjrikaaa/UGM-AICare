import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google'
import ClientProvider from "@/components/auth/ClientProvider";
import HeaderWrapper from "@/components/ui/HeaderWrapper";
import FooterWrapper from "@/components/ui/FooterWrapper";
import { Suspense } from "react";
import GlobalSkeleton from "@/components/ui/GlobalSkeleton";
import { Toaster } from "react-hot-toast";

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
        className={`${inter.className} bg-gray-900`}
      >
        <ClientProvider>
          <div className="flex flex-col min-h-screen">
          <HeaderWrapper />
            <main className="flex-grow"> {/* Added flex-grow */}
                 <Suspense fallback={<GlobalSkeleton />}>
                     {children}
                 </Suspense>
             </main>
            
          <FooterWrapper />
          </div>
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
        </ClientProvider>
      </body>
    </html>
  );
}
