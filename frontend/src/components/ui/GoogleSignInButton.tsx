"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { motion } from "framer-motion";

export default function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/aika" });
    } catch (error) {
      console.error("Error signing in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      disabled={isLoading}
      onClick={handleSignIn}
      className="flex items-center justify-center gap-2 bg-[#FFCA40] text-[#001D58] px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-[#001D58] border-t-transparent rounded-full animate-spin" />
      ) : (
        <FaGoogle size={20} />
      )}
      <span>Sign in with UGM Mail</span>
    </motion.button>
  );
}