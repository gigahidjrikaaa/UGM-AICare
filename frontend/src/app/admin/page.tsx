"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiLock, FiMail, FiAlertCircle, FiLogIn } from "react-icons/fi";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";

export default function AdminLoginPage() {
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_ADMIN_EMAIL_DEFAULT || "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      router.push("/admin/dashboard");
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("admin-login", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(`Login failed: ${result.error}`);
        }
      } else if (result?.ok) {
        router.push("/admin/dashboard"); // Explicit redirect after successful sign-in
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred during login.");
      console.error("Login submission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && session?.user?.role === "admin")) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="animate-pulse text-white text-lg">Loading Admin Access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-md p-8 md:p-10 rounded-xl shadow-2xl border border-white/20">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/UGM_Lambang.png"
              alt="UGM AICare Logo"
              width={60}
              height={60}
              className="mb-3"
            />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-white/70">UGM-AICare Management</p>
          </div>

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
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/80 mb-1"
              >
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
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-[#FFCA40] text-[#001D58] font-semibold rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:ring-offset-2 focus:ring-offset-[#001D58] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#001D58]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FiLogIn className="mr-2 h-5 w-5 transform transition-transform duration-150 group-hover:translate-x-1" />
                )}
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <Link href="/forgot-password">
              <p className="text-sm text-[#FFCA40] hover:underline">Forgot your password?</p>
            </Link>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-white/60">
          For authorized personnel only. All access is monitored.
        </p>
      </motion.div>
    </div>
  );
}