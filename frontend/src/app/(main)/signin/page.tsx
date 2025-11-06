"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiAlertCircle, 
  FiLogIn, 
  FiShield 
} from "@/icons";
import ParticleBackground from "@/components/ui/ParticleBackground";

export default function SignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  
  const mentalHealthTips = [
    {
      icon: "🌱",
      title: "Growth Mindset",
      message: "Every challenge is an opportunity to learn and grow stronger."
    },
    {
      icon: "🧘‍♀️",
      title: "Mindful Moments",
      message: "Take a deep breath. Your mental health journey starts with small, mindful moments."
    },
    {
      icon: "💪",
      title: "Inner Strength",
      message: "You are stronger than you think. Trust your ability to overcome difficulties."
    },
    {
      icon: "🌟",
      title: "Self-Compassion",
      message: "Be kind to yourself. Treat yourself with the same compassion you'd show a good friend."
    },
    {
      icon: "🌈",
      title: "Hope & Healing",
      message: "Healing isn't linear. Every step forward, no matter how small, is progress."
    },
    {
      icon: "🤝",
      title: "Connection Matters",
      message: "You're not alone in this journey. Seeking help is a sign of strength, not weakness."
    }
  ];

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === 'admin') {
        router.push('/admin/conversations');
      } else {
        router.push("/aika");
      }
    }
  }, [status, session, router]);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % mentalHealthTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [mentalHealthTips.length]);

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
        } else {
          setError(`Sign in failed: ${result.error}`);
        }
      } else if (!result?.ok) {
        setError("Sign in failed. Please try again.");
      }
      // On success, the useEffect for status change will handle the redirect.
    } catch (err: unknown) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] flex relative">
      {/* Particle Background */}
      <div className="absolute inset-0 z-0">
        <ParticleBackground 
          count={80}
          colors={["#FFCA40", "#6A98F0", "#ffffff"]}
          minSize={2}
          maxSize={8}
          speed={1}
        />
      </div>

      {/* Left Side - Tips and Mindful Messages */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden z-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-[#FFCA40] blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 rounded-full bg-[#FFCA40] blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-white blur-2xl"></div>
        </div>

        <div className="flex flex-col justify-center items-center px-6 py-4 relative z-10 w-full">
          {/* Brand Header */}
          <div className="text-center mb-5">
            <div className="mx-auto w-18 h-18 bg-gradient-to-br from-[#FFCA40] to-[#FFD700] rounded-2xl flex items-center justify-center mb-3 shadow-2xl">
              <Image
                src="/images/logo.png"
                alt="UGM-AICare"
                width={36}
                height={36}
                className="w-9 h-9"
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-1">UGM-AICare</h2>
            <p className="text-white/70 text-base">Your Mental Health Companion</p>
          </div>

          {/* Rotating Tips */}
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-2xl max-w-lg w-full text-center"
          >
            <div className="text-4xl mb-3">{mentalHealthTips[tipIndex].icon}</div>
            <h3 className="text-lg font-semibold text-white mb-3">{mentalHealthTips[tipIndex].title}</h3>
            <p className="text-white/80 leading-relaxed text-sm">{mentalHealthTips[tipIndex].message}</p>
          </motion.div>

          {/* Tip Progress Indicators */}
          <div className="flex space-x-2 mt-5">
            {mentalHealthTips.map((_, index) => (
              <button
                key={index}
                onClick={() => setTipIndex(index)}
                aria-label={`View tip ${index + 1}: ${mentalHealthTips[index].title}`}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === tipIndex ? 'bg-[#FFCA40] scale-110' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-lg">
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-[#FFCA40] text-xl font-bold">24/7</div>
              <div className="text-white/60 text-xs">AI Support</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-[#FFCA40] text-xl font-bold">CBT</div>
              <div className="text-white/60 text-xs">Therapy</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-[#FFCA40] text-xl font-bold">Safe</div>
              <div className="text-white/60 text-xs">& Secure</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-4 lg:px-6 lg:py-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white/8 backdrop-blur-2xl p-6 lg:p-8 rounded-2xl border border-white/15 shadow-2xl max-w-lg w-full"
        >
          {/* Mobile Logo - Only visible on mobile */}
          <div className="text-center mb-4 lg:hidden">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[#FFCA40] to-[#FFD700] rounded-xl flex items-center justify-center mb-2 shadow-lg">
              <Image
                src="/images/logo.png"
                alt="UGM-AICare"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Welcome Back</h1>
            <p className="text-white/70 text-sm">Sign in to continue your wellness journey</p>
          </div>

          {/* Desktop Header */}
          <div className="text-center mb-5 hidden lg:block">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/70 text-base">Sign in to continue your wellness journey</p>
          </div>
          
          {/* Error Message with Suspense */}
          <Suspense fallback={<div className="h-12"></div>}>
            <ErrorMessage setError={setError} />
          </Suspense>
          
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl mb-4 flex items-center backdrop-blur-sm"
            >
              <FiAlertCircle className="mr-2 flex-shrink-0 w-4 h-4" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input - Modern Style */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-white/90">
                Email Address
              </label>
              <div className="relative group">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 group-focus-within:text-[#FFCA40] transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Password Input - Modern Style */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-white/90">
                Password
              </label>
              <div className="relative group">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 group-focus-within:text-[#FFCA40] transition-colors" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors p-1"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-[#FFCA40] hover:text-[#FFCA40]/80 transition-colors font-medium">
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button - Modern Gradient */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#FFCA40] to-[#FFD700] text-[#001D58] font-semibold rounded-xl hover:from-[#FFD700] hover:to-[#FFCA40] focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#001D58]"></div>
              ) : (
                <>
                  <FiLogIn className="mr-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Additional Options */}
          <div className="mt-5 space-y-3">
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] text-white/60 text-xs">or continue with</span>
              </div>
            </div>

            {/* UGM Students Sign In */}
            <div className="text-center">
              <Link 
                href="/signin-ugm" 
                className="inline-flex items-center justify-center w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/15 transition-all duration-300 group backdrop-blur-sm"
              >
                <FiShield className="mr-2 w-4 h-4 text-[#FFCA40]" />
                <span className="font-medium text-sm">UGM Students - Continue with Google</span>
              </Link>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <div className="text-white/60 text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#FFCA40] hover:text-[#FFCA40]/80 transition-colors font-medium">
                  Create one here
                </Link>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center space-x-4 text-white/40">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs">Secure Connection</span>
              </div>
              <div className="flex items-center space-x-1">
                <FiShield className="w-3 h-3" />
                <span className="text-xs">Privacy Protected</span>
              </div>
            </div>
          </div>

          {/* Terms and Privacy */}
          <p className="text-xs text-center text-white/40 mt-4">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-[#FFCA40] hover:text-[#FFCA40]/80 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#FFCA40] hover:text-[#FFCA40]/80 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function ErrorMessage({ setError }: { setError: (error: string | null) => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          setError('Invalid email or password. Please try again.');
          break;
        case 'Configuration':
          setError('There was a problem signing you in. Please try again later.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
      }
    }
  }, [searchParams, setError]);

  return null;
}