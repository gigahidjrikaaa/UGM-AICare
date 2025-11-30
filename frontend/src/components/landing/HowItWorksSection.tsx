"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaArrowRight } from '@/icons';

const steps = [
  {
    number: "01",
    emoji: "💬",
    title: "Start Chatting",
    description: "Open Aika and share what you're feeling. No sign-up needed, no login required.",
    time: "10 seconds"
  },
  {
    number: "02",
    emoji: "🤝",
    title: "Get Support",
    description: "Aika listens, provides coping techniques, and creates an action plan tailored to your situation.",
    time: "2-5 minutes"
  },
  {
    number: "03",
    emoji: "👨‍⚕️",
    title: "Connect to Counselor",
    description: "If you need professional help, Aika directly books you with a UGM counselor. Optional, based on your needs.",
    time: "Whenever ready"
  }
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#000B1F] to-[#001D58] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-[#FFCA40] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-[#6A98F0] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-4 py-2 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4">
            <span className="text-[#FFCA40] font-semibold text-sm">HOW IT WORKS</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Super Easy,<br />
            <span className="text-[#FFCA40]">Just 3 Steps</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            From stress to support in 60 seconds. Literally.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#4ADE80]/10 rounded-full border border-[#4ADE80]/30">
            <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            <span className="text-[#4ADE80] font-semibold">Total time: ~60 seconds to get support</span>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative"
            >
              {/* Connecting Line (Desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/3 left-full w-full h-0.5 bg-gradient-to-r from-[#FFCA40] to-transparent -z-10" />
              )}

              {/* Card */}
              <motion.div
                whileHover={{ y: -10, scale: 1.05, transition: { duration: 0.3 } }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl h-full relative overflow-hidden group"
              >
                {/* Gradient Overlay on Hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[#FFCA40]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />

                {/* Step Number */}
                <div className="absolute top-8 right-8 text-6xl font-black text-white/5">
                  {step.number}
                </div>

                {/* Emoji */}
                <div className="text-6xl mb-4 relative z-10">
                  {step.emoji}
                </div>

                {/* Time Badge */}
                <div className="inline-block px-3 py-1 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4">
                  <span className="text-[#FFCA40] text-sm font-semibold">⏱️ {step.time}</span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 relative z-10">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed relative z-10">
                  {step.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Video Demonstration Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-[#001D58] to-[#002A7A] rounded-3xl p-12 border-2 border-[#FFCA40]/30 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 grid-pattern" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Video Placeholder */}
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-[#000B1F] to-[#001D58] flex items-center justify-center relative overflow-hidden border-2 border-[#FFCA40]/20">
                {/* Placeholder */}
                <div className="text-center p-8">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-4"
                  >
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-[#FFCA40]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </div>
                  </motion.div>
                  <h4 className="text-xl font-bold text-white mb-2">Watch Demo</h4>
                  <p className="text-gray-400 text-sm">See how it works (2 min video)</p>
                </div>

                {/* Animated Border */}
                <motion.div
                  className="absolute inset-0 border-2 border-[#FFCA40]"
                  animate={{ 
                    borderRadius: ["10% 90% 80% 20% / 20% 10% 90% 80%", "90% 10% 20% 80% / 80% 90% 10% 20%", "10% 90% 80% 20% / 20% 10% 90% 80%"]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ filter: "blur(10px)", opacity: 0.3 }}
                />
              </div>
            </div>

            {/* Right: CTA */}
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Ready to Try Now?<br />
                <span className="text-[#FFCA40]">Free Forever</span>
              </h3>
              
              <div className="space-y-4 mb-8">
                {[
                  "✓ No sign-up or login required",
                  "✓ Response time < 2 seconds",
                  "✓ 100% confidential & private",
                  "✓ Integrated with UGM services",
                  "✓ Available 24/7, even during weekends"
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="text-lg text-gray-300 flex items-center gap-3"
                  >
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>

              <Link href="/aika">
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: "0 20px 60px rgba(255, 202, 64, 0.5)" 
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-12 py-5 bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFB700] text-[#001D58] rounded-full font-bold text-xl flex items-center justify-center shadow-2xl transition-all w-full sm:w-auto overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
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

              <p className="text-gray-400 text-sm mt-4">
                🔥 <span className="text-[#FFCA40] font-semibold">500+ students</span> helped this week
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
