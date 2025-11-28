"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  FaComments,
  FaHeartbeat,
  FaArrowRight,
  FaStar
} from 'react-icons/fa';
import {
  FiHeart,
  FiShield,
  FiUsers,
  FiCheckCircle,
  FiZap,
  FiClock
} from 'react-icons/fi';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen w-full bg-[#00112e] text-white selection:bg-[#FFCA40] selection:text-[#001D58] font-sans">

      {/* ============================ */}
      {/* HERO SECTION */}
      {/* ============================ */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?q=80&w=1920&auto=format&fit=crop"
            alt="Calm Library"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#001D58]/80 via-[#00112e]/60 to-[#00112e]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <p className="text-[#FFCA40] font-medium tracking-[0.2em] uppercase text-sm mb-6 font-sans">
              Universitas Gadjah Mada
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-medium leading-tight mb-8 tracking-tight">
              Your AI Companion for <br />
              <span className="italic text-white/80">Mental Wellness.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-light leading-relaxed mb-12 font-sans">
              Bridging the gap between students and mental health support. UGM-AICare offers proactive intervention, resource management, and a safe space for you to be heard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/signup">
                <button className="px-8 py-4 bg-[#FFCA40] text-[#001D58] rounded-full font-medium text-lg hover:bg-white transition-colors duration-300 font-sans">
                  Start Your Journey
                </button>
              </Link>
              <Link href="/about">
                <button className="px-8 py-4 bg-transparent border border-white/30 text-white rounded-full font-medium text-lg hover:bg-white/10 transition-colors duration-300 font-sans backdrop-blur-sm">
                  Learn More
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Floating Aika Widget */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="absolute hidden lg:flex top-1/2 -right-12 xl:-right-32 transform -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl items-center gap-4 max-w-xs text-left shadow-2xl"
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#FFCA40]">
              <Image
                src="/aika-human.jpeg"
                alt="Aika Avatar"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[#FFCA40] text-xs font-bold uppercase tracking-wider mb-1">Aika Agent</p>
              <p className="text-white text-sm leading-snug">"Hi there! I'm here to listen whenever you're ready."</p>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
        >
          <span className="text-xs uppercase tracking-widest font-sans">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </motion.div>
      </section>

      {/* ============================ */}
      {/* SECTION 2: ABOUT UGM-AICARE */}
      {/* ============================ */}
      <section className="relative py-32 px-6 bg-[#00112e]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <RevealOnScroll direction="up">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-serif leading-tight">
                Transforming Support <br />
                <span className="text-[#FFCA40]">Proactive & Personal</span>
              </h2>
              <p className="text-white/70 text-lg font-light leading-relaxed font-sans">
                UGM-AICare is more than just a platform; it's a paradigm shift from reactive to proactive mental health support. We utilize advanced AI agents to identify needs early, manage resources efficiently, and provide timely interventions. Our goal is to ensure every student feels supported, understood, and empowered to seek help when needed.
              </p>
              <div className="pt-4">
                <Link href="/about" className="inline-flex items-center gap-2 text-[#FFCA40] border-b border-[#FFCA40]/30 pb-1 hover:border-[#FFCA40] transition-colors font-sans">
                  <span className="uppercase tracking-widest text-sm">Our Mission</span>
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="left">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm">
              <Image
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1920&auto=format&fit=crop"
                alt="Students talking"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001D58]/80 to-transparent opacity-60" />
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ */}
      {/* SECTION 3: MEET AIKA */}
      {/* ============================ */}
      <section className="relative py-32 px-6 bg-[#000d24]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <RevealOnScroll direction="right">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl order-2 lg:order-1 border border-white/10 shadow-2xl">
              <Image
                src="/aika-human.jpeg"
                alt="Aika AI Companion"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000d24]/80 via-transparent to-transparent" />
            </div>
          </RevealOnScroll>

          <RevealOnScroll direction="up">
            <div className="space-y-8 order-1 lg:order-2">
              <span className="text-[#FFCA40] text-xs font-bold tracking-widest uppercase border border-[#FFCA40]/30 px-3 py-1 rounded-full font-sans">
                Meet Aika
              </span>
              <h2 className="text-4xl md:text-5xl font-serif leading-tight">
                An empathetic listener, always here for you.
              </h2>
              <p className="text-white/70 text-lg font-light leading-relaxed font-sans">
                Aika is an intelligent AI agent designed to provide immediate, non-judgmental support. Whether you need to vent, seek advice, or just have a quiet companion, Aika is available 24/7. She helps bridge the gap until you can connect with human counselors if needed.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-4 font-sans">
                <div>
                  <h3 className="text-xl font-serif mb-2 text-white">24/7 Availability</h3>
                  <p className="text-sm text-white/50">Support whenever you need it.</p>
                </div>
                <div>
                  <h3 className="text-xl font-serif mb-2 text-white">Confidential</h3>
                  <p className="text-sm text-white/50">Your conversations are private.</p>
                </div>
              </div>

              <div className="pt-6">
                <Link href="/aika">
                  <button className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all duration-300 font-sans">
                    Talk to Aika
                  </button>
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ */}
      {/* SECTION 4: QUOTE / MOOD */}
      {/* ============================ */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#001D58] via-[#5e3a00] to-[#000000] opacity-80" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-10">
          <RevealOnScroll direction="up">
            <div className="flex justify-center mb-8">
              <div className="w-px h-16 bg-[#FFCA40]/50" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif leading-tight text-white/90">
              "Grace flows quietly through patience. When you stop striving to fix everything, you begin to see how love already surrounds and carries you forward."
            </h2>
            <p className="mt-8 text-[#FFCA40] uppercase tracking-widest text-sm">
              Daily Calm • Wednesday, 21
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============================ */}
      {/* SECTION 5: RESOURCES GRID */}
      {/* ============================ */}
      <section className="relative py-32 px-6 bg-[#00112e]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <h2 className="text-4xl font-serif">Your Journey</h2>
            <Link href="/resources" className="text-sm uppercase tracking-widest text-white/50 hover:text-white transition-colors">
              (view all)
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Meditation", subtitle: "02 — 05", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop" },
              { title: "Journaling", subtitle: "Daily Reflection", img: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800&auto=format&fit=crop" },
              { title: "Counseling", subtitle: "Professional Help", img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800&auto=format&fit=crop" },
            ].map((item, i) => (
              <RevealOnScroll key={i} direction="up">
                <div className="group cursor-pointer">
                  <div className="relative aspect-[3/4] overflow-hidden mb-6">
                    <Image
                      src={item.img}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
                  </div>
                  <div className="flex justify-between items-start border-t border-white/10 pt-4">
                    <div>
                      <h3 className="text-xl font-serif mb-1">{item.title}</h3>
                      <p className="text-xs uppercase tracking-widest text-white/50">{item.subtitle}</p>
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[#FFCA40]">
                      <FaArrowRight />
                    </span>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
