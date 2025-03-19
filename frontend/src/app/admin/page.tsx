"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiLock, FiMail, FiAlertCircle } from "react-icons/fi";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // This would be replaced with your actual authentication API
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // If login successful, redirect to dashboard
      router.push("/admin/dashboard");
    } catch (error: unknown) {
      let errorMessage = "Login failed. Please check your credentials.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex flex-col">
      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Form Header */}
          <div className="bg-[#001545]/50 p-6 border-b border-white/10">
            <div className="flex items-center justify-center space-x-4">
              <div className="p-3 bg-white/10 rounded-full">
                <FiLock className="text-[#FFCA40] text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                <p className="text-white/70 text-sm">Access the UGM-AICare admin dashboard</p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center text-white">
                <FiAlertCircle className="text-red-400 mr-3 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiMail className="text-white/50" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border border-white/20 text-white text-sm rounded-lg block w-full pl-10 p-2.5 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50"
                    placeholder="admin@ugm.ac.id"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiLock className="text-white/50" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border border-white/20 text-white text-sm rounded-lg block w-full pl-10 p-2.5 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#FFCA40] hover:bg-[#ffb700] text-[#001D58] font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#001D58]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging In...
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </div>

            <div className="mt-6 text-center">
              <Link href="/forgot-password" className="text-sm text-[#FFCA40] hover:underline">
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="px-6 py-4 bg-[#001545]/30 text-center border-t border-white/10">
            <p className="text-white/70 text-xs">
              For authorized personnel only. Unauthorized access is prohibited.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}