"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiLogIn, FiShield } from "react-icons/fi";
import ErrorMessage from "../../../components/ErrorMessage";

export default function SignIn() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect if already authenticated
    if (status === "authenticated") {
      router.push("/aika");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic client-side validation
    if (!email || !password) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    // Password strength validation (minimum 8 characters)
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.");
        } else if (result.error === "AccessDenied") {
          setError("Access denied. Please check your credentials.");
        } else {
          setError(`Sign in failed: ${result.error}`);
        }
      } else if (result?.ok) {
        router.push("/aika");
      } else {
        setError("Sign in failed. Please try again.");
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

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
              src="/aika-avatar.png" 
              alt="Aika" 
              width={100} 
              height={100}
              className="rounded-full bg-[#FFCA40]/20 p-2"
            />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Welcome to Aika</h1>
          <p className="text-gray-300 text-center mb-8">
            Sign in to your account to continue
          </p>
          
          {/* Wrap useSearchParams in a Suspense boundary */}
          <Suspense fallback={<div className="h-12"></div>}>
            <ErrorMessage setError={setError} />
          </Suspense>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-lg mb-6 flex items-center"
            >
              <FiAlertCircle className="mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] outline-none transition-colors"
                  placeholder="your-email@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-[#FFCA40] text-[#001D58] font-semibold rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:ring-offset-2 focus:ring-offset-[#001D58] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#001D58]"></div>
                ) : (
                  <FiLogIn className="mr-2 h-5 w-5 transform transition-transform duration-150 group-hover:translate-x-1" />
                )}
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/60">or</span>
              </div>
            </div>

            <div className="text-center">
              <Link 
                href="/signin-ugm" 
                className="inline-flex items-center text-sm text-[#FFCA40] hover:text-[#FFCA40]/80 transition-colors"
              >
                <FiShield className="mr-2" size={16} />
                UGM Students - Sign in with Google
              </Link>
            </div>

            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-white/60 hover:text-white transition-colors">
                Forgot your password?
              </Link>
            </div>

            <div className="text-center">
              <span className="text-sm text-white/60">Don&apos;t have an account? </span>
              <Link href="/signup" className="text-sm text-[#FFCA40] hover:underline">
                Sign up
              </Link>
            </div>
          </div>
          
          <p className="text-xs text-center text-gray-400 mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
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