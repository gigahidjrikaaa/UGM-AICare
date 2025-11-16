"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  FaComments, 
  FaHeartbeat, 
  FaArrowRight,
  HiChevronRight,
  FiPhone, 
  FiHeart,
  FiShield,
  FiUsers,
  FaStar,
  FiCheckCircle,
  FiArrowRight
} from '@/icons';
import ParticleBackground from '@/components/ui/ParticleBackground';

// ============ ENHANCED ANIMATION COMPONENTS ============

// Animated Text Effect Component (per character) - Kept for future use
/* const AnimatedText = ({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) => {
  const letters = text.split("");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child}>
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}; */

// Floating Card Animation
const FloatingCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, type: "spring" }}
      whileHover={{ y: -10, transition: { duration: 0.3 } }}
    >
      {children}
    </motion.div>
  );
};

// Reveal on Scroll Component
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

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [showChatPreview, setShowChatPreview] = useState(false);
  const [activeComparison, setActiveComparison] = useState<'aika' | 'traditional' | 'generic'>('aika');
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scrolls so that the animation loads (quick fix)
  useEffect(() => {
    if (mounted) {
      window.scrollTo({
        top: 10,
        behavior: 'smooth' 
      });
    }
  }, [mounted]);
  
  if (!mounted) return null;

  return (
    <main className="min-h-screen overflow-x-hidden w-full pt-24">
      {/* ============================ */}
      {/* HERO SECTION - REDESIGNED */}
      {/* ============================ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#000B1F] via-[#001D58] to-[#002A7A]">
        {/* Enhanced Animated Particle Background - Reduced for Performance */}
        <div className="absolute inset-0 z-0">
          <ParticleBackground 
            count={50} 
            colors={["#FFCA40", "#6A98F0", "#ffffff", "#FF6B9D", "#4ADE80"]} 
            minSize={1} 
            maxSize={6} 
            speed={0.4} 
          />
        </div>
        
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 z-0 opacity-30">
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, rgba(106, 152, 240, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 50% 80%, rgba(255, 107, 157, 0.15) 0%, transparent 50%)',
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
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-5">
          <div className="absolute inset-0 grid-pattern" />
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
            <div className="text-center lg:text-left space-y-8">
              {/* Badge with Animation */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFCA40]/20 to-[#FFB700]/20 backdrop-blur-xl rounded-full border border-[#FFCA40]/30 shadow-lg"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <FaStar className="text-[#FFCA40]" />
                </motion.div>
                <span className="text-white font-medium text-sm">
                  Trusted by <span className="text-[#FFCA40] font-bold">UGM Students</span>
                </span>
              </motion.div>
              
              {/* Main Heading - Redesigned */}
              <div className="space-y-4">
                <motion.h1 
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tight"
                >
                  Your Mental
                  <br />
                  <span className="relative inline-block mt-2">
                    <span className="relative z-10 bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFCA40] bg-clip-text text-transparent">
                      Health Hub
                    </span>
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
                      className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-[#FFCA40]/30 to-[#FFB700]/30 blur-sm origin-left"
                    />
                  </span>
                </motion.h1>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="flex items-center gap-2 justify-center lg:justify-start"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-2 w-2 bg-[#4ADE80] rounded-full"
                  />
                  <span className="text-[#4ADE80] font-semibold text-lg">Available 24/7</span>
                </motion.div>
              </div>
              
              {/* Description - Enhanced */}
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                Meet <span className="text-[#FFCA40] font-bold">Aika</span> – your compassionate AI companion. 
                Get instant support, personalized guidance, and connect with professional counselors whenever you need.
              </motion.p>
              
              {/* CTA Buttons - Enhanced */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4"
              >
                <Link href="/aika">
                  <motion.button
                    whileHover={{ 
                      scale: 1.05, 
                      boxShadow: "0 20px 60px rgba(255, 202, 64, 0.5)" 
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative px-8 py-4 bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg flex items-center justify-center shadow-2xl transition-all w-full sm:w-auto overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Start Chatting Now
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <FaArrowRight />
                      </motion.span>
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-[#FFB700] to-[#FFCA40]"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "0%" }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </Link>
                
                <Link href="/resources">
                  <motion.button
                    whileHover={{ 
                      scale: 1.05,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      borderColor: "rgba(255, 202, 64, 0.5)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="group px-8 py-4 bg-white/5 text-white rounded-full font-semibold text-lg flex items-center justify-center backdrop-blur-xl border-2 border-white/20 shadow-xl w-full sm:w-auto transition-all"
                  >
                    <FiPhone className="mr-2 group-hover:text-[#FFCA40] transition-colors" />
                    Crisis Resources
                  </motion.button>
                </Link>
              </motion.div>
            </div>
            
            {/* Right Column - Interactive 3D Card */}
            <div className="flex justify-center lg:justify-end relative">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, rotateY: -20 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 80,
                  delay: 0.4,
                  duration: 1.2
                }}
                className="relative w-full max-w-[550px]"
                style={{ perspective: "1000px" }}
              >
                {/* Main Card Container */}
                <motion.div
                  animate={{ 
                    y: [0, -20, 0],
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  {/* Glow Effect Behind Card */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#FFCA40]/20 via-[#6A98F0]/20 to-[#FF6B9D]/20 rounded-3xl blur-2xl opacity-75" />
                  
                  {/* Main Image Card */}
                  <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl">
                    <Image 
                      src="/aika-human.jpeg" 
                      alt="Aika - Your Mental Health Companion" 
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#001D58]/80 via-transparent to-transparent" />
                    
                    {/* Overlay Info Card */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="bg-white/10 backdrop-blur-2xl rounded-2xl p-5 border border-white/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#FFCA40] to-[#FFB700] flex items-center justify-center text-2xl">
                                🤖
                              </div>
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -bottom-1 -right-1 h-4 w-4 bg-[#4ADE80] rounded-full border-2 border-white"
                              />
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-lg">Aika</h3>
                              <p className="text-white/70 text-sm">Your AI Companion</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4ADE80]/20 rounded-full">
                            <motion.div
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="h-2 w-2 bg-[#4ADE80] rounded-full"
                            />
                            <span className="text-[#4ADE80] text-xs font-semibold">Online</span>
                          </div>
                        </div>
                        <p className="text-white/80 text-sm">
                          &ldquo;I&apos;m here to listen and support you through any challenge. Let&apos;s talk whenever you&apos;re ready.&rdquo;
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* ============================ */}
      {/* ============================ */}
      {/* WHAT IS AIKA - INTERACTIVE EXPLANATION */}
      {/* ============================ */}
      <section className="relative py-32 bg-gradient-to-b from-[#00308F] to-[#001D58] overflow-hidden">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 opacity-10">
          <motion.div 
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 right-[10%] w-96 h-96 bg-[#FFCA40]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-[10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Title Section */}
          <RevealOnScroll>
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {/* Badge */}
                <motion.div
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FFCA40]/20 to-[#FFB700]/20 backdrop-blur-xl rounded-full border border-[#FFCA40]/30 mb-8"
                  whileHover={{ scale: 1.05 }}
                >
                  <FaStar className="text-[#FFCA40]" />
                  <span className="text-white/90 font-semibold">AI-Powered Mental Health Platform</span>
                </motion.div>

                <h2 className="text-5xl lg:text-7xl font-black text-white mb-8 leading-tight">
                  What is{' '}
                  <span className="bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFCA40] bg-clip-text text-transparent">
                    Aika?
                  </span>
                </h2>
                
                <p className="text-2xl lg:text-3xl text-white/90 max-w-5xl mx-auto leading-relaxed mb-6 font-light">
                  Not just another chatbot. <strong className="font-bold text-[#FFCA40]">UGM-AICare</strong> is an intelligent mental health ecosystem with{' '}
                  <span className="relative inline-block">
                    <span className="text-[#FFCA40] font-bold text-4xl">4 AI agents</span>
                    <motion.div
                      className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] rounded-full"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    />
                  </span>{' '}
                  working together to provide comprehensive, real-time mental health support.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 text-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-[#4ADE80] rounded-full animate-pulse" />
                    <span>24/7 Crisis Detection</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-2">
                    <FiShield className="text-[#FFCA40]" />
                    <span>Privacy-First Design</span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-blue-400" />
                    <span>Multi-Agent System</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </RevealOnScroll>

          {/* Interactive Agent Cards - Enhanced Design */}
          <div className="mb-20">
            {/* Section Title */}
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Meet the <span className="text-[#FFCA40]">4 AI Agents</span>
              </h3>
              <p className="text-white/70 text-lg">Your comprehensive mental health support team</p>
            </motion.div>

            {/* Horizontal Scrollable Agent Cards */}
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide pb-8 snap-x snap-mandatory">
                <div className="flex gap-6 px-4 min-w-max">
                  {[
                    {
                      icon: "🚨",
                      name: "Safety Triage Agent",
                      acronym: "STA",
                      tagline: "Your Guardian Angel",
                      color: "from-red-500 to-pink-600",
                      borderColor: "border-red-400/40",
                      glowColor: "shadow-red-500/20",
                      description: "Real-time crisis detection and instant escalation routing",
                      features: ["Instant risk assessment", "Crisis banner alerts", "Human handoff protocols", "Complete audit trail"],
                      details: "Monitors every conversation in real-time using advanced NLP. When crisis signals are detected (like mentions of self-harm or suicidal ideation), STA immediately escalates to human oversight and displays crisis resources.",
                      example: {
                        title: "Crisis Detection in Action",
                        demo: "Harmful intent detected → Immediate escalation → Human oversight notified → Crisis resources displayed"
                      },
                      stat: { value: "<1s", label: "Response Time" }
                    },
                    {
                      icon: "💬",
                      name: "Therapeutic Coach Agent",
                      acronym: "TCA",
                      tagline: "Your Personal Coach",
                      color: "from-blue-500 to-purple-600",
                      borderColor: "border-blue-400/40",
                      glowColor: "shadow-blue-500/20",
                      description: "Personalized intervention plans and evidence-based action steps",
                      features: ["AI-generated plans", "Progress tracking", "Evidence-based strategies", "Resource recommendations"],
                      details: "Creates customized intervention plans based on your situation. Plans include step-by-step guidance, progress tracking, and evidence-based techniques from CBT and Indonesian mental health guidelines (JUKNIS P2 GME).",
                      example: {
                        title: "Your Personalized Plan",
                        demo: "Conversation analysis → Custom plan generation → Step-by-step actions → Progress monitoring → Regular check-ins"
                      },
                      stat: { value: "100%", label: "Personalized" }
                    },
                    {
                      icon: "🗂️",
                      name: "Case Management Agent",
                      acronym: "CMA",
                      tagline: "Behind-the-Scenes Hero",
                      color: "from-green-500 to-teal-600",
                      borderColor: "border-green-400/40",
                      glowColor: "shadow-green-500/20",
                      description: "Seamless case management for clinical staff coordination",
                      features: ["Dashboard oversight", "SLA tracking", "Case timelines", "Escalation management"],
                      details: "Provides clinical staff with a comprehensive dashboard to manage cases, track SLAs, and ensure no student falls through the cracks. Maintains complete case timelines and escalation workflows for seamless coordination.",
                      example: {
                        title: "Behind the Scenes",
                        demo: "Clinical dashboard → Case assignments → SLA monitoring → Timeline tracking → No student left behind"
                      },
                      stat: { value: "24/7", label: "Monitoring" }
                    },
                    {
                      icon: "🔍",
                      name: "Intelligence Analytics",
                      acronym: "IA",
                      tagline: "Privacy-First Insights",
                      color: "from-amber-500 to-orange-600",
                      borderColor: "border-amber-400/40",
                      glowColor: "shadow-amber-500/20",
                      description: "Privacy-preserving insights and trend analysis",
                      features: ["Differential privacy", "Consent-aware data", "Anonymized analytics", "Clinical approval gates"],
                      details: "Uses differential privacy (ε-δ budget tracking) to generate insights without compromising individual privacy. All analytics require clinical approval and explicit user consent, ensuring your data remains protected.",
                      example: {
                        title: "Privacy-First Analytics",
                        demo: "Differential privacy applied → User consent required → Clinical approval needed → Insights generated → Individual privacy protected"
                      },
                      stat: { value: "100%", label: "Private" }
                    },
                  ].map((agent, index) => {
                    const isSelected = selectedAgent === index;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedAgent(isSelected ? null : index)}
                        className="flex-shrink-0 w-[90%] sm:w-[400px] cursor-pointer snap-start"
                      >
                        <motion.div 
                          className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border-2 transition-all h-full overflow-hidden ${
                            isSelected 
                              ? `border-[#FFCA40] bg-white/15 shadow-2xl ${agent.glowColor}` 
                              : `${agent.borderColor} hover:border-white/40`
                          }`}
                          whileHover={{ scale: 1.02, y: -5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Gradient Overlay */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-5 pointer-events-none`} />
                          
                          {/* Content Container */}
                          <div className="relative p-8">
                            {/* Header with Icon and Badge */}
                            <div className="flex items-start gap-4 mb-6">
                              <motion.div 
                                className={`relative text-7xl p-5 rounded-2xl bg-gradient-to-br ${agent.color} ${isSelected ? 'ring-4 ring-[#FFCA40]/50' : ''} shadow-xl`}
                                animate={isSelected ? { 
                                  rotate: [0, -5, 5, -5, 0],
                                  scale: [1, 1.05, 1]
                                } : {}}
                                transition={{ duration: 0.6 }}
                              >
                                {agent.icon}
                                {/* Pulse effect when selected */}
                                {isSelected && (
                                  <motion.div
                                    className="absolute inset-0 rounded-2xl bg-white"
                                    initial={{ opacity: 0.3, scale: 1 }}
                                    animate={{ opacity: 0, scale: 1.5 }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                  />
                                )}
                              </motion.div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-2xl font-bold text-white">{agent.name}</h3>
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${agent.color} text-white shadow-lg`}>
                                    {agent.acronym}
                                  </span>
                                </div>
                                <p className="text-[#FFCA40] text-sm font-semibold mb-1">{agent.tagline}</p>
                                <p className="text-white/80 text-sm leading-relaxed">{agent.description}</p>
                              </div>
                            </div>
                            
                            {/* Stat Badge */}
                            <div className="flex items-center gap-3 mb-6">
                              <div className={`bg-gradient-to-r ${agent.color} px-4 py-2 rounded-full`}>
                                <div className="text-white font-black text-lg">{agent.stat.value}</div>
                              </div>
                              <span className="text-white/70 text-sm font-medium">{agent.stat.label}</span>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                              {agent.features.map((feature, idx) => (
                                <motion.div
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-white/90 bg-white/5 rounded-lg p-3 border border-white/10"
                                  initial={{ opacity: 0, y: 10 }}
                                  whileInView={{ opacity: 1, y: 0 }}
                                  viewport={{ once: true }}
                                  transition={{ delay: 0.1 * idx }}
                                >
                                  <FiCheckCircle className="text-[#FFCA40] flex-shrink-0 mt-0.5 text-base" />
                                  <span className="leading-tight">{feature}</span>
                                </motion.div>
                              ))}
                            </div>
                            
                            {/* Expandable Details */}
                            <motion.div
                              initial={false}
                              animate={{
                                height: isSelected ? 'auto' : 0,
                                opacity: isSelected ? 1 : 0
                              }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-6 border-t border-white/20 space-y-4">
                                {/* Detailed Description */}
                                <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-xl p-5 border border-white/20">
                                  <p className="text-white/90 text-sm leading-relaxed">{agent.details}</p>
                                </div>
                                
                                {/* Example Flow */}
                                <div className={`bg-gradient-to-br ${agent.color} bg-opacity-20 rounded-xl p-5 border-2 ${agent.borderColor}`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className={`h-2 w-2 bg-gradient-to-r ${agent.color} rounded-full`} />
                                    <p className="text-[#FFCA40] font-bold text-sm">{agent.example.title}</p>
                                  </div>
                                  <p className="text-white/80 text-xs font-mono leading-relaxed">{agent.example.demo}</p>
                                </div>
                              </div>
                            </motion.div>

                            {/* Expand/Collapse Button */}
                            <motion.div
                              className={`text-sm font-bold mt-6 flex items-center justify-center gap-2 py-3 rounded-xl transition-colors ${
                                isSelected 
                                  ? 'bg-[#FFCA40]/20 text-[#FFCA40]' 
                                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                              }`}
                              whileHover={{ scale: 1.02 }}
                            >
                              <span>{isSelected ? 'Show Less' : 'Learn More'}</span>
                              <motion.span
                                animate={{ rotate: isSelected ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                ▼
                              </motion.span>
                            </motion.div>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              
              {/* Scroll Indicator */}
              <motion.div 
                className="text-center mt-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                  <FiArrowRight className="text-[#FFCA40] animate-pulse" />
                  <span className="text-white/60 text-sm font-medium">Swipe to explore all agents</span>
                  <FiArrowRight className="text-[#FFCA40] animate-pulse" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* How They Work Together - Interactive Flow */}
          <RevealOnScroll>
            <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl p-12 rounded-3xl border border-white/20 mb-20">
              <h3 className="text-3xl font-bold text-white text-center mb-12">
                How the <span className="text-[#FFCA40]">4 Agents Collaborate</span>
              </h3>
              
              {/* Desktop Flow */}
              <div className="hidden lg:flex items-center justify-between gap-8">
                {[
                  { 
                    icon: "🚨", 
                    name: "STA", 
                    color: "from-red-500 to-pink-600",
                    action: "Monitors every message",
                    detail: "Real-time crisis detection"
                  },
                  { 
                    icon: "💬", 
                    name: "TCA", 
                    color: "from-blue-500 to-purple-600",
                    action: "Creates intervention plans",
                    detail: "Personalized strategies"
                  },
                  { 
                    icon: "🗂️", 
                    name: "CMA", 
                    color: "from-green-500 to-teal-600",
                    action: "Manages clinical follow-up",
                    detail: "Case coordination"
                  },
                  { 
                    icon: "🔍", 
                    name: "IA", 
                    color: "from-amber-500 to-orange-600",
                    action: "Provides insights",
                    detail: "Privacy-preserving analytics"
                  },
                ].map((agent, index) => (
                  <>
                    <motion.div
                      className="flex-1"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                    >
                      <div className="text-center">
                        <motion.div 
                          className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-3xl shadow-xl`}
                          whileHover={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          {agent.icon}
                        </motion.div>
                        <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${agent.color} text-white font-bold text-sm mb-2`}>
                          {agent.name}
                        </div>
                        <p className="text-white font-semibold text-sm mb-1">{agent.action}</p>
                        <p className="text-white/60 text-xs">{agent.detail}</p>
                      </div>
                    </motion.div>
                    
                    {index < 3 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }}
                        className="flex items-center"
                      >
                        <FiArrowRight className="text-[#FFCA40] text-4xl" />
                      </motion.div>
                    )}
                  </>
                ))}
              </div>

              {/* Mobile Flow */}
              <div className="lg:hidden space-y-6">
                {[
                  { icon: "🚨", name: "STA", color: "from-red-500 to-pink-600", action: "Monitors every message" },
                  { icon: "💬", name: "TCA", color: "from-blue-500 to-purple-600", action: "Creates intervention plans" },
                  { icon: "🗂️", name: "CMA", color: "from-green-500 to-teal-600", action: "Manages clinical follow-up" },
                  { icon: "🔍", name: "IA", color: "from-amber-500 to-orange-600", action: "Provides insights" },
                ].map((agent, index) => (
                  <>
                    <motion.div
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                        {agent.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${agent.color} text-white font-bold text-xs mb-1`}>
                          {agent.name}
                        </div>
                        <p className="text-white text-sm">{agent.action}</p>
                      </div>
                    </motion.div>
                    
                    {index < 3 && (
                      <div className="flex justify-center">
                        <FiArrowRight className="text-[#FFCA40] text-3xl rotate-90" />
                      </div>
                    )}
                  </>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          {/* Why UGM-AICare is Different */}
          <RevealOnScroll>
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {[
                {
                  icon: <FiShield className="text-4xl" />,
                  title: "Privacy-First Architecture",
                  description: "Your conversations are protected with end-to-end encryption, differential privacy, and clinical approval gates. We never share your data without explicit consent.",
                  color: "from-blue-500/20 to-purple-500/20",
                  borderColor: "border-blue-400/40"
                },
                {
                  icon: <FiUsers className="text-4xl" />,
                  title: "Multi-Agent Intelligence",
                  description: "Unlike single chatbots, our 4 specialized AI agents work together like a real mental health team—detecting crises, creating plans, managing cases, and generating insights.",
                  color: "from-pink-500/20 to-rose-500/20",
                  borderColor: "border-pink-400/40"
                },
                {
                  icon: <FiHeart className="text-4xl" />,
                  title: "Built for UGM Students",
                  description: "Designed specifically for Indonesian university students with culturally-aware support, integration with UGM counseling services, and evidence-based Indonesian mental health guidelines.",
                  color: "from-amber-500/20 to-orange-500/20",
                  borderColor: "border-amber-400/40"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className={`bg-gradient-to-br ${feature.color} backdrop-blur-xl p-8 rounded-3xl border-2 ${feature.borderColor} hover:border-white/40 transition-all`}
                >
                  <div className="text-[#FFCA40] mb-4">
                    {feature.icon}
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-4">{feature.title}</h4>
                  <p className="text-white/80 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Visual Breathing Room - Spacer */}
      <div className="h-16 bg-gradient-to-b from-[#001D58] to-[#001D58]"></div>

      {/* ============================ */}
      {/* WHAT'S DIFFERENT - COMPARISON TABLE */}
      {/* ============================ */}
      <section className="relative py-20 bg-gradient-to-b from-[#001D58] to-[#00308F]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                What Makes Aika <span className="text-[#FFCA40]">Different</span>?
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
                Not just another mental health app — a complete safety-first ecosystem
              </p>
              
              {/* Interactive Comparison Tabs */}
              <div className="flex justify-center gap-4 flex-wrap">
                {[
                  { value: 'aika', label: 'Aika', color: 'from-[#FFCA40] to-[#FFB700]' },
                  { value: 'traditional', label: 'Traditional', color: 'from-blue-500 to-purple-600' },
                  { value: 'generic', label: 'Generic Apps', color: 'from-gray-500 to-gray-600' },
                ].map((tab) => (
                  <motion.button
                    key={tab.value}
                    onClick={() => setActiveComparison(tab.value as 'aika' | 'traditional' | 'generic')}
                    className={`px-6 py-3 rounded-full font-semibold transition-all ${
                      activeComparison === tab.value
                        ? `bg-gradient-to-r ${tab.color} text-white scale-105`
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tab.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          <div className="overflow-x-auto">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-4 px-4 text-white/70 font-semibold">Feature</th>
                    <th className="py-4 px-4 text-center">
                      <div className="text-[#FFCA40] font-bold text-lg">Aika</div>
                      <div className="text-white/50 text-xs">Safety Agent Suite</div>
                    </th>
                    <th className="py-4 px-4 text-center text-white/70">Traditional Counseling</th>
                    <th className="py-4 px-4 text-center text-white/70">Generic AI Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Availability", aika: "24/7 Instant", traditional: "Office hours only", generic: "24/7 Limited" },
                    { feature: "Wait Time", aika: "< 2 seconds", traditional: "Days to weeks", generic: "Minutes" },
                    { feature: "Crisis Detection", aika: "Real-time AI + Human", traditional: "Requires appointment", generic: "Basic keywords" },
                    { feature: "Intervention Plans", aika: "AI-generated + Tracked", traditional: "Manual planning", generic: "Generic advice" },
                    { feature: "Privacy Guarantee", aika: "Differential Privacy (ε-δ)", traditional: "Confidential", generic: "Privacy policy" },
                    { feature: "UGM Integration", aika: "GMC, HPU, Psychology", traditional: "Varies", generic: "None" },
                    { feature: "Cost", aika: "Free for UGM", traditional: "Paid sessions", generic: "Freemium" },
                    { feature: "Evidence Base", aika: "JUKNIS P2 + CBT", traditional: "Clinical practice", generic: "General wellness" },
                  ].map((row, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-white font-medium">{row.feature}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[#FFCA40] font-semibold">
                          <FiCheckCircle /> {row.aika}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-white/60">{row.traditional}</td>
                      <td className="py-4 px-4 text-center text-white/60">{row.generic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* FEATURES SECTION - ENHANCED */}
      {/* ============================ */}
      <section className="relative py-24 bg-gradient-to-b from-[#00308F] to-[#001D58]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              More Than Just <span className="text-[#FFCA40]">Chat</span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              A complete mental health ecosystem designed specifically for UGM students
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FaComments />,
                gradient: "from-blue-500 to-purple-600",
                title: "AI-Powered Conversations",
                description: "Chat with Aika 24/7 using Google Gemini AI. Get empathetic, context-aware responses in English or Bahasa Indonesia.",
                features: ["Multi-agent orchestration", "Crisis detection", "Intent-based routing"]
              },
              {
                icon: <FiCheckCircle />,
                gradient: "from-pink-500 to-rose-600",
                title: "Intervention Plans",
                description: "Automatically generated step-by-step action plans with progress tracking and evidence-based strategies.",
                features: ["Automated generation", "Visual progress bars", "Database-backed tracking"]
              },
              {
                icon: "🏆",
                gradient: "from-purple-500 to-indigo-600",
                title: "NFT Achievement Badges",
                description: "Earn unique blockchain-backed badges on EDU Chain testnet for reaching mental health milestones.",
                features: ["ERC1155 smart contract", "Verifiable achievements", "DID wallet linking"]
              },
              {
                icon: "📝",
                gradient: "from-amber-500 to-orange-600",
                title: "Journaling & Mood Tracking",
                description: "Write private journal entries, track your emotional journey, and earn daily streaks for consistency.",
                features: ["Dated entries", "Mood analytics", "Streak rewards"]
              },
              {
                icon: "👨‍⚕️",
                gradient: "from-teal-500 to-cyan-600",
                title: "Professional Counseling",
                description: "Book appointments with licensed psychologists at GMC, HPU, or Faculty of Psychology UGM.",
                features: ["Online scheduling", "UGM partners", "Verified counselors"]
              },
              {
                icon: <FiPhone />,
                gradient: "from-red-500 to-pink-600",
                title: "24/7 Crisis Hotlines",
                description: "Immediate access to UGM Crisis Line, SEJIWA 119, and emergency resources when you need help now.",
                features: ["One-tap calling", "WhatsApp support", "Emergency protocols"]
              },
            ].map((feature, index) => (
              <FloatingCard key={index} delay={index * 0.1}>
                <div className="group h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  {/* Icon */}
                  <div className={`h-16 w-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {typeof feature.icon === 'string' ? feature.icon : feature.icon}
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-white/70 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  {/* Feature List */}
                  <ul className="space-y-2 mb-6">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-white/60 text-sm">
                        <FiCheckCircle className="text-[#FFCA40] flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Learn More Link */}
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-2 text-[#FFCA40] font-semibold cursor-pointer"
                  >
                    <span>Learn more</span>
                    <FaArrowRight className="text-sm" />
                  </motion.div>
                </div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Breathing Room - Spacer */}
      <div className="h-20 bg-[#00308F]"></div>
      
      {/* ============================ */}
      {/* HOW IT WORKS SECTION */}
      {/* ============================ */}
      <section className="relative py-24 bg-gradient-to-b from-[#00308F] to-[#001D58]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Get Started in 3 Simple Steps
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Begin your mental wellness journey with Aika today
              </p>
            </div>
          </RevealOnScroll>
          
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#FFCA40]/20 via-[#FFCA40]/50 to-[#FFCA40]/20 -translate-y-1/2 z-0"></div>
            
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 relative z-10">
              {[
                {
                  step: "01",
                  title: "Sign Up",
                  description: "Create your free account using your UGM email. Quick and secure registration in under a minute.",
                  icon: <FiUsers />,
                  color: "from-blue-500 to-purple-600"
                },
                {
                  step: "02",
                  title: "Start Chatting",
                  description: "Begin your conversation with Aika. Share what's on your mind in a safe, judgment-free space.",
                  icon: <FaComments />,
                  color: "from-pink-500 to-rose-600"
                },
                {
                  step: "03",
                  title: "Get Support",
                  description: "Receive personalized guidance, resources, and ongoing support tailored to your unique needs.",
                  icon: <FaHeartbeat />,
                  color: "from-green-500 to-emerald-600"
                },
              ].map((item, index) => (
                <RevealOnScroll key={index} direction={index === 0 ? "left" : index === 2 ? "right" : "up"}>
                  <div className="relative">
                    {/* Step Number Badge */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 lg:left-8 lg:translate-x-0">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl`}
                      >
                        {item.step}
                      </motion.div>
                    </div>
                    
                    {/* Card */}
                    <div className="bg-white/5 backdrop-blur-md p-8 pt-14 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 h-full">
                      <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white text-2xl mb-6`}>
                        {item.icon}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-4">
                        {item.title}
                      </h3>
                      
                      <p className="text-white/70 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* INTERACTIVE CHAT PREVIEW */}
      {/* ============================ */}
      <section className="relative py-20 bg-gradient-to-b from-[#00308F] to-[#002A7A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              See <span className="text-[#FFCA40]">Aika</span> in Action
            </h2>
            <p className="text-xl text-white/70">
              Click the message button to see how a conversation with Aika feels
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left: Chat Preview */}
            <FloatingCard>
              <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-[#001D58] to-[#002A7A] p-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FFCA40] to-[#FFB700] rounded-full flex items-center justify-center text-2xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Aika</h3>
                    <p className="text-white/60 text-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Online 24/7
                    </p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                  {!showChatPreview ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <motion.button
                        onClick={() => setShowChatPreview(true)}
                        className="px-8 py-4 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg shadow-xl flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FaComments />
                        Start Sample Conversation
                      </motion.button>
                      <p className="text-white/60 text-sm mt-4">See how Aika responds</p>
                    </div>
                  ) : (
                    <>
                      {/* User Message */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex justify-end"
                      >
                        <div className="bg-[#FFCA40] text-[#001D58] rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs">
                          <p className="text-sm">I&apos;m feeling really stressed about my exams next week...</p>
                        </div>
                      </motion.div>

                      {/* Aika Typing Indicator */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FFCA40] to-[#FFB700] rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          🤖
                        </div>
                        <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="flex gap-1">
                            <motion.span
                              className="w-2 h-2 bg-white/60 rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                            />
                            <motion.span
                              className="w-2 h-2 bg-white/60 rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                            />
                            <motion.span
                              className="w-2 h-2 bg-white/60 rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Aika Response */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2.5 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FFCA40] to-[#FFB700] rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          🤖
                        </div>
                        <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                          <p className="text-white/90 text-sm mb-3">
                            I understand that exam stress can feel overwhelming. You&apos;re not alone in feeling this way. Let me help you create a plan to manage this stress.
                          </p>
                          <div className="bg-white/5 rounded-lg p-3 space-y-2">
                            <p className="text-[#FFCA40] font-semibold text-xs">📋 I&apos;ve created an intervention plan for you:</p>
                            <ul className="text-white/80 text-xs space-y-1">
                              <li className="flex items-center gap-2">
                                <FiCheckCircle className="text-green-400 flex-shrink-0" />
                                Break study schedule into manageable chunks
                              </li>
                              <li className="flex items-center gap-2">
                                <FiCheckCircle className="text-green-400 flex-shrink-0" />
                                Practice 5-minute breathing exercises
                              </li>
                              <li className="flex items-center gap-2">
                                <FiCheckCircle className="text-green-400 flex-shrink-0" />
                                Connect with study group for support
                              </li>
                            </ul>
                          </div>
                        </div>
                      </motion.div>

                      {/* Reset Button */}
                      <div className="flex justify-center pt-4">
                        <motion.button
                          onClick={() => setShowChatPreview(false)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors"
                          whileHover={{ scale: 1.05 }}
                        >
                          ↻ Restart Demo
                        </motion.button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </FloatingCard>

            {/* Right: Benefits */}
            <div className="space-y-6">
              {[
                {
                  icon: "⚡",
                  title: "Instant Response",
                  description: "Get immediate support without waiting in line. Aika responds in under 2 seconds."
                },
                {
                  icon: "🧠",
                  title: "Intelligent Understanding",
                  description: "Powered by Google Gemini AI with context-aware responses and empathetic language."
                },
                {
                  icon: "📋",
                  title: "Actionable Plans",
                  description: "Receive personalized intervention plans with step-by-step guidance you can follow."
                },
                {
                  icon: "🔒",
                  title: "Private & Confidential",
                  description: "All conversations are encrypted and protected with differential privacy guarantees."
                },
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FFCA40] to-[#FFB700] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg mb-1">{benefit.title}</h4>
                    <p className="text-white/70 text-sm">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}

              <Link href="/aika">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 px-8 py-4 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg shadow-xl flex items-center justify-center gap-3"
                >
                  Try Aika Now <FaArrowRight />
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Breathing Room - Spacer */}
      <div className="h-24 bg-gradient-to-b from-[#002A7A] to-[#001D58]"></div>

      {/* ============================ */}
      {/* WHY TRUST AIKA? - MERGED PRIVACY & CREDIBILITY SECTION */}
      {/* ============================ */}
      <section className="relative py-24 bg-gradient-to-b from-[#001D58] to-[#002A7A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                Why Trust <span className="text-[#FFCA40]">Aika</span>?
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                Enterprise-grade privacy meets evidence-based mental health support
              </p>
            </div>
          </RevealOnScroll>

          {/* Combined Grid: Privacy (4 cards) + Credibility (3 cards) */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Privacy Cards */}
            {[
              {
                icon: <FiShield />,
                title: "Differential Privacy",
                description: "ε-δ budget tracking ensures your data contributes to insights without exposing your identity",
                badge: "Mathematical guarantees",
                category: "privacy"
              },
              {
                icon: "�",
                title: "GDPR Compliant",
                description: "Full compliance with data protection regulations. Your data, your control, always.",
                badge: "EU data standards",
                category: "privacy"
              },
              {
                icon: "�",
                title: "Consent Ledger",
                description: "Append-only audit trail of all consent decisions with easy withdrawal workflows",
                badge: "Immutable consent log",
                category: "privacy"
              },
              {
                icon: "👨‍⚕️",
                title: "Human Oversight",
                description: "Clinical approval checkpoints for all automated recommendations and escalations",
                badge: "Fail-closed design",
                category: "privacy"
              },
            ].map((item, index) => (
              <FloatingCard key={index} delay={index * 0.1}>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all h-full text-center">
                  <div className="text-4xl mb-4 flex justify-center">
                    {typeof item.icon === 'string' ? item.icon : item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/70 text-sm mb-3">{item.description}</p>
                  <span className="inline-block px-3 py-1 bg-[#FFCA40]/20 text-[#FFCA40] rounded-full text-xs font-semibold">
                    {item.badge}
                  </span>
                </div>
              </FloatingCard>
            ))}
          </div>

          {/* Credibility Cards - 3 columns */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <FloatingCard delay={0.4}>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all h-full">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-2xl font-bold text-white mb-3">Indonesian Guidelines</h3>
                <p className="text-white/80 mb-4">
                  Based on <strong>JUKNIS P2 Gangguan Mental Emosional</strong> — Indonesia&apos;s official clinical guidelines for mental health support.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs">Evidence-based</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs">Culturally adapted</span>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.5}>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all h-full">
                <div className="text-5xl mb-4">🏛️</div>
                <h3 className="text-2xl font-bold text-white mb-3">UGM Partnerships</h3>
                <p className="text-white/80 mb-4">
                  Integrated with <strong>GMC, HPU, and Faculty of Psychology</strong> for seamless referrals and professional support.
                </p>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-center gap-2">
                    <FiCheckCircle className="text-[#FFCA40]" />
                    Gadjah Mada Medical Center
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheckCircle className="text-[#FFCA40]" />
                    Health Promoting University
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheckCircle className="text-[#FFCA40]" />
                    Faculty Psychology Counseling
                  </li>
                </ul>
              </div>
            </FloatingCard>

            <FloatingCard delay={0.6}>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all h-full">
                <div className="text-5xl mb-4">🧠</div>
                <h3 className="text-2xl font-bold text-white mb-3">CBT Modules</h3>
                <p className="text-white/80 mb-4">
                  Structured <strong>Cognitive Behavioral Therapy</strong> modules with guided exercises and thought records.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="bg-white/10 rounded-lg p-3">
                    <span className="text-white font-semibold">Thought Record</span>
                    <p className="text-white/70 text-xs mt-1">Challenge negative thoughts</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <span className="text-white font-semibold">Problem Breakdown</span>
                    <p className="text-white/70 text-xs mt-1">Step-by-step solutions</p>
                  </div>
                </div>
              </div>
            </FloatingCard>
          </div>

          {/* Trust Banner */}
          <RevealOnScroll>
            <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center">
              <p className="text-white/90 text-lg mb-4">
                <strong className="text-white">Your conversations stay private. Your support is evidence-based.</strong>
              </p>
              <p className="text-white/70">
                Encrypted end-to-end • No data selling • Complete audit trails • Indonesian clinical guidelines • UGM official partner
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ */}
      {/* FAQ SECTION */}
      {/* ============================ */}
      <section className="relative py-20 bg-gradient-to-b from-[#002A7A] to-[#001D58]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              Frequently Asked <span className="text-[#FFCA40]">Questions</span>
            </h2>
            <p className="text-xl text-white/70">
              Everything you need to know about Aika
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "Is Aika replacing my counselor?",
                answer: "No. Aika is a complement to professional counseling, not a replacement. Think of Aika as your 24/7 first responder who can provide immediate support, generate intervention plans, and help you decide when to see a human counselor. For complex issues or crisis situations, Aika will always recommend connecting with professional services."
              },
              {
                question: "What happens if I'm in crisis?",
                answer: "Aika's Safety Triage Agent (STA) monitors every conversation for crisis signals. If detected, you'll immediately see crisis resources (UGM Crisis Line, SEJIWA 119, Emergency 112), receive grounding techniques, and the system will alert clinical staff for human follow-up. The Case Management Agent (CMA) ensures no crisis goes unnoticed."
              },
              {
                question: "Can anyone see my conversations?",
                answer: "Your conversations are encrypted and private. Only you can see your chat history. Clinical staff can only access your data if: (1) you give explicit consent, (2) there's a crisis situation requiring intervention, or (3) aggregated, anonymized data is used for insights (with differential privacy guarantees). We never sell your data."
              },
              {
                question: "Is it really available at 3 AM?",
                answer: "Yes! Aika is available 24/7/365. Whether it's 3 AM before your exam, midnight during a panic attack, or Sunday afternoon when you feel lonely — Aika is always ready to chat. Average response time is under 2 seconds."
              },
              {
                question: "What are NFT Achievement Badges?",
                answer: "As you reach mental health milestones (like consistent journaling or completing intervention plans), you earn unique NFT badges on the EDU Chain blockchain. These are verifiable achievements you truly own — a fun way to celebrate your mental wellness journey!"
              },
              {
                question: "How does Aika know what advice to give?",
                answer: "Aika is powered by Google Gemini AI and trained on Indonesian mental health guidelines (JUKNIS P2 Gangguan Mental Emosional). The Therapeutic Coach Agent (TCA) uses evidence-based strategies from CBT and generates personalized intervention plans. All recommendations go through ethical guardrails and can be escalated to human counselors."
              },
              {
                question: "Is this only for UGM students?",
                answer: "Currently, UGM-AICare is optimized for UGM students with direct integration to campus resources (GMC, HPU, Faculty of Psychology). However, anyone can use Aika for general mental health support. UGM students get priority access to campus-specific features and resources."
              },
              {
                question: "What if Aika doesn't understand me?",
                answer: "Aika supports both English and Bahasa Indonesia. If Aika's response doesn't fit your situation, you can always rephrase, provide more context, or request specific resources. Remember: Aika learns from conversations (with your consent) to improve over time. You can also book a human counselor anytime."
              },
            ].map((faq, index) => (
              <FloatingCard key={index} delay={index * 0.05}>
                <details className="group bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                  <summary className="flex items-center justify-between cursor-pointer text-white font-semibold text-lg">
                    <span>{faq.question}</span>
                    <span className="text-[#FFCA40] transform group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-4 text-white/80 leading-relaxed">{faq.answer}</p>
                </details>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Breathing Room - Spacer */}
      <div className="h-20 bg-gradient-to-b from-[#001D58] to-[#001D58]"></div>

      {/* ============================ */}
      {/* TESTIMONIALS SECTION */}
      {/* ============================ */}
      <section className="relative py-24 bg-gradient-to-b from-[#001D58] to-[#00308F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                <span className="text-[#FFCA40]">Success Stories</span> from UGM Students
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Real students, real challenges, real progress
              </p>
            </div>
          </RevealOnScroll>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Rania A.",
                role: "Sophomore, Engineering",
                content: "Got through finals week with Aika's study break routine. The intervention plan helped me prioritize tasks without panic. Now I actually sleep before exams!",
                rating: 5,
                scenario: "📚 Exam Stress"
              },
              {
                name: "Fajar D.",
                role: "Junior, Medicine",
                content: "Aika detected my overwhelm at 2 AM and gave me grounding exercises that actually worked. Booked my first counseling session at GMC the next day. Best decision.",
                rating: 5,
                scenario: "😰 Overwhelm"
              },
              {
                name: "Dinda K.",
                role: "Freshman, Psychology",
                content: "Felt homesick and isolated. Aika connected me to peer support groups and helped me build my campus community. Found courage to reach out.",
                rating: 5,
                scenario: "🏠 Homesickness"
              },
            ].map((testimonial, index) => (
              <FloatingCard key={index} delay={index * 0.1}>
                <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:bg-white/10 transition-all h-full flex flex-col">
                  {/* Scenario Badge */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-[#FFCA40]/20 text-[#FFCA40] rounded-full text-sm font-semibold">
                      {testimonial.scenario}
                    </span>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FaStar key={i} className="text-[#FFCA40] fill-current" />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <p className="text-white/80 text-lg leading-relaxed mb-6 flex-grow">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  
                  {/* Author */}
                  <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FFCA40] to-[#FFB700] rounded-full flex items-center justify-center text-[#001D58] font-bold text-lg">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{testimonial.name}</div>
                      <div className="text-white/60 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Breathing Room - Spacer */}
      <div className="h-24 bg-gradient-to-b from-[#00308F] to-[#00308F]"></div>
      
      {/* ============================ */}
      {/* FINAL CTA SECTION */}
      {/* ============================ */}
      <section className="relative py-32 bg-gradient-to-b from-[#00308F] to-[#001D58] overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FFCA40]/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#6A98F0]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <RevealOnScroll>
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8"
              >
                <FiHeart className="text-[#FF6B9D]" />
                <span className="text-white font-medium">Your mental health matters</span>
              </motion.div>
              
              <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Ready to Start Your <br />
                <span className="text-[#FFCA40]">Wellness Journey?</span>
              </h2>
              
              <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
                Join thousands of UGM students who trust Aika for their mental health support. Take the first step today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/aika">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px rgba(255, 202, 64, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    className="px-12 py-6 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-xl shadow-2xl transition-all flex items-center justify-center gap-3"
                  >
                    Talk to Aika Now
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <HiChevronRight className="text-2xl" />
                    </motion.span>
                  </motion.button>
                </Link>
                
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                    whileTap={{ scale: 0.98 }}
                    className="px-12 py-6 bg-white/10 text-white rounded-full font-bold text-xl backdrop-blur-md border-2 border-white/20 shadow-xl transition-all"
                  >
                    Create Free Account
                  </motion.button>
                </Link>
              </div>
              
              <p className="text-white/50 text-sm mt-8">
                Free forever. No credit card required. Start in under 60 seconds.
              </p>
            </div>
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
