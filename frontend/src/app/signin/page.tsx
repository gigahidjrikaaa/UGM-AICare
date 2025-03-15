"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignIn() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check for error in URL
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "AccessDenied") {
        setError("You must use a UGM email address to sign in.");
      } else {
        setError("An error occurred during sign in. Please try again.");
      }
    }
    
    // Redirect if already authenticated
    if (status === "authenticated") {
      router.push("/aika");
    }
  }, [status, router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] text-white flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 border-b border-white/10">
        <Link href="/" className="flex items-center">
          <Image 
            src="/UGM_Lambang.png" 
            alt="UGM Logo" 
            width={40} 
            height={40} 
            className="mr-3"
          />
          <span className="text-white text-xl font-bold">UGM-AICare</span>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-lg max-w-md w-full"
        >
          <div className="flex justify-center mb-6">
            <Image 
              src="/Aika.png" 
              alt="Aika" 
              width={100} 
              height={100}
              className="rounded-full bg-[#FFCA40]/20 p-2"
            />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Welcome to Aika</h1>
          <p className="text-gray-300 text-center mb-8">
            Sign in with your UGM email account to get started
          </p>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="flex justify-center">
            <GoogleSignInButton />
          </div>
          
          <p className="text-xs text-center text-gray-400 mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            Only UGM email addresses (@ugm.ac.id) are allowed.
          </p>
        </motion.div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 px-6 text-center text-sm text-gray-400 border-t border-white/10">
        <p>© 2025 UGM-AICare Team. All rights reserved.</p>
      </footer>
    </div>
  );
}