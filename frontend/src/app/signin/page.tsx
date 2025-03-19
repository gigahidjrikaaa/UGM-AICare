"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import Image from "next/image";
import { motion } from "framer-motion";
import ErrorMessage from "../../components/ErrorMessage";

export default function SignIn() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect if already authenticated
    if (status === "authenticated") {
      router.push("/aika");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] text-white flex flex-col">
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
          
          {/* Wrap useSearchParams in a Suspense boundary */}
          <Suspense fallback={<div className="h-12"></div>}>
            <ErrorMessage setError={setError} />
          </Suspense>
          
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