"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  FaComments, 
  FaHeartbeat, 
  FaArrowRight,
  FiHeart,
  FiShield,
  FiUsers,
  FaStar,
  FiCheckCircle,
  FiZap,
  FiClock
} from '@/icons';
import ParticleBackground from '@/components/ui/ParticleBackground';

// ============ ANIMATION COMPONENTS ============

const RevealOnScroll = ({ children, direction = "up" }: { children: React.ReactNode; direction?: "up" | "down" | "left" | "right" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const variants = {
    up: { y: 50, opacity: 0 },
    down: { y: -50, opacity: 0 },
    left: { x: 50, opacity: 0 },
    right: { x: -50, opacity: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={variants[direction]}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : variants[direction]}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// ============ MAIN COMPONENT ============

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      window.scrollTo({ top: 10, behavior: 'smooth' });
    }
  }, [mounted]);
  
  if (!mounted) return null;

  return (
    <main className="min-h-screen overflow-x-hidden w-full pt-24">
      {/* ============================ */}
      {/* HERO SECTION */}
      {/* ============================ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#001D58] via-[#00308F] to-[#002A7A]">
        {/* Particle Background */}
        <div className="absolute inset-0 z-0">
          <ParticleBackground 
            count={50} 
            colors={["#FFCA40", "#6A98F0", "#ffffff"]} 
            minSize={1} 
            maxSize={6} 
            speed={0.4} 
          />
        </div>
        
        {/* Animated Mesh Gradient */}
        <div className="absolute inset-0 z-0 opacity-30">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, rgba(106, 152, 240, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 50% 80%, rgba(255, 202, 64, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.15) 0%, transparent 50%)',
              ]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 w-full py-20">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ opacity: heroOpacity }}
            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          >
            {/* Left Column - Content */}
            <div className="text-center lg:text-left space-y-6">
              {/* Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFCA40]/20 to-[#FFB700]/20 backdrop-blur-xl rounded-full border border-[#FFCA40]/30 shadow-lg"
              >
                <FaStar className="text-[#FFCA40]" />
                <span className="text-white font-medium text-sm">
                  Trusted by <span className="text-[#FFCA40] font-bold">UGM Students</span>
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold text-white leading-tight"
              >
                Your Mental Health 
                <span className="bg-gradient-to-r from-[#FFCA40] via-[#FFD700] to-[#FFCA40] bg-clip-text text-transparent"> Companion</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg md:text-xl text-white/80 max-w-xl"
              >
                AI-powered support designed for Indonesian university students. Chat with Aika 24/7 for empathetic guidance, track your wellbeing, and access professional resources.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg shadow-2xl shadow-[#FFCA40]/50 hover:shadow-[#FFCA40]/70 transition-all"
                  >
                    Start Free Today
                  </motion.button>
                </Link>
                <Link href="/about">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2 justify-center"
                  >
                    Learn More
                    <FaArrowRight className="text-sm" />
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center gap-6 justify-center lg:justify-start text-sm text-white/60"
              >
                <div className="flex items-center gap-2">
                  <FiShield className="text-[#FFCA40]" />
                  <span>Privacy-First</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="text-[#FFCA40]" />
                  <span>UGM Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="text-[#FFCA40]" />
                  <span>24/7 Available</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Aika Character */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="relative h-[400px] lg:h-[500px]"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <motion.div
                  animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 2, 0, -2, 0]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 6,
                    ease: "easeInOut"
                  }}
                  className="relative w-[300px] h-[300px] lg:w-[400px] lg:h-[400px]"
                >
                  <Image 
                    src="/aika-human.jpeg"
                    alt="Aika - Your AI Companion" 
                    fill
                    className="object-contain drop-shadow-2xl rounded-full"
                    priority
                  />
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FFCA40]/20 to-[#6A98F0]/20 rounded-full blur-3xl -z-10"></div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================ */}
      {/* KEY FEATURES - SIMPLIFIED */}
      {/* ============================ */}
      <section className="relative py-20 bg-gradient-to-b from-[#002A7A] to-[#001D58] overflow-hidden">
        {/* Subtle particle background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <ParticleBackground 
            count={30} 
            colors={["#FFCA40", "#6A98F0", "#ffffff"]} 
            minSize={1} 
            maxSize={4} 
            speed={0.3} 
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Everything You Need for <span className="text-[#FFCA40]">Mental Wellbeing</span>
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Comprehensive support designed for the unique challenges of student life
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FaComments className="text-4xl" />,
                title: "AI Chat Support",
                description: "Talk to Aika anytime for empathetic, judgment-free conversations in Bahasa Indonesia.",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: <FaHeartbeat className="text-4xl" />,
                title: "Mood Tracking",
                description: "Track your emotions, identify patterns, and build healthier mental habits over time.",
                color: "from-pink-500 to-red-500"
              },
              {
                icon: <FiUsers className="text-4xl" />,
                title: "Professional Resources",
                description: "Connect with licensed counselors and access curated mental health resources.",
                color: "from-purple-500 to-indigo-500"
              }
            ].map((feature, idx) => (
              <RevealOnScroll key={idx} direction="up">
                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:border-[#FFCA40]/50 transition-all"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 text-white`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-white/70 leading-relaxed">{feature.description}</p>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* HOW IT WORKS - SIMPLIFIED */}
      {/* ============================ */}
      <section className="relative py-20 bg-gradient-to-b from-[#001D58] to-[#00308F]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Get Started in <span className="text-[#FFCA40]">3 Simple Steps</span>
              </h2>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Create Account",
                description: "Sign up with your UGM email in under 60 seconds"
              },
              {
                step: "2",
                title: "Chat with Aika",
                description: "Start talking about what's on your mind, anytime"
              },
              {
                step: "3",
                title: "Track Progress",
                description: "Monitor your wellbeing journey and access resources"
              }
            ].map((item, idx) => (
              <RevealOnScroll key={idx} direction="up">
                <div className="relative text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#FFCA40] to-[#FFB700] rounded-full flex items-center justify-center mx-auto mb-6 text-[#001D58] text-3xl font-bold shadow-2xl shadow-[#FFCA40]/50">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/70">{item.description}</p>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#FFCA40] to-transparent"></div>
                  )}
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* QUICK STATS */}
      {/* ============================ */}
      <section className="relative py-16 bg-gradient-to-b from-[#00308F] to-[#002A7A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "5,000+", label: "Active Users" },
              { value: "24/7", label: "Available" },
              { value: "95%", label: "Satisfaction" },
              { value: "50K+", label: "Conversations" }
            ].map((stat, idx) => (
              <RevealOnScroll key={idx}>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-[#FFCA40] mb-2">{stat.value}</div>
                  <div className="text-white/70">{stat.label}</div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* WHY CHOOSE US */}
      {/* ============================ */}
      <section className="relative py-20 bg-gradient-to-b from-[#002A7A] to-[#001D58]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Why <span className="text-[#FFCA40]">UGM-AICare</span>?
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Built specifically for Indonesian students, with privacy and cultural understanding at its core
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FiShield />,
                title: "Privacy-First",
                description: "Your conversations are encrypted and never shared. Full transparency in data handling."
              },
              {
                icon: <FaStar />,
                title: "Culturally Aware",
                description: "Aika understands Indonesian context, values, and the unique pressures of student life."
              },
              {
                icon: <FiZap />,
                title: "Evidence-Based",
                description: "Built on CBT principles and validated through university research partnerships."
              }
            ].map((item, idx) => (
              <RevealOnScroll key={idx}>
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 text-center">
                  <div className="w-12 h-12 bg-[#FFCA40]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#FFCA40] text-2xl">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/70 text-sm">{item.description}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* FINAL CTA */}
      {/* ============================ */}
      <section className="relative py-24 bg-gradient-to-br from-[#001D58] via-[#00308F] to-[#002A7A] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ParticleBackground 
            count={40} 
            colors={["#FFCA40", "#6A98F0", "#ffffff"]} 
            minSize={1} 
            maxSize={5} 
            speed={0.4} 
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <RevealOnScroll>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Your <span className="text-[#FFCA40]">Wellbeing Journey</span>?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join thousands of UGM students who trust AICare for their mental health support
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-12 py-5 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-xl shadow-2xl shadow-[#FFCA40]/50 hover:shadow-[#FFCA40]/70 transition-all"
                >
                  Get Started Free
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-12 py-5 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-xl border border-white/20 hover:bg-white/20 transition-all"
                >
                  Learn More
                </motion.button>
              </Link>
            </div>
            <p className="text-white/50 text-sm mt-8">
              Free forever. No credit card required. Start in under 60 seconds.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ */}
      {/* FLOATING ACTION BUTTON - CRISIS HELP */}
      {/* ============================ */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.a
          href="https://wa.me/6281228773800"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full font-bold shadow-2xl group"
          whileHover={{ scale: 1.1, boxShadow: "0 25px 50px rgba(239, 68, 68, 0.5)" }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <FiHeart className="text-2xl" />
          </motion.div>
          <span className="hidden md:block">Need Help Now?</span>
        </motion.a>
      </motion.div>

    </main>
  );
}
