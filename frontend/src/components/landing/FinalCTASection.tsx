"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaArrowRight } from '@/icons';

export default function FinalCTASection() {
  return (
    <section className="py-32 bg-gradient-to-b from-[#000B1F] via-[#001D58] to-[#002A7A] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FFCA40] rounded-full blur-[150px] opacity-20" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-[#FFCA40]/20 via-[#FFD770]/10 to-[#FFB700]/20 backdrop-blur-xl rounded-[3rem] p-12 sm:p-16 border-2 border-[#FFCA40]/30 shadow-2xl text-center relative overflow-hidden"
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <motion.div
              className="absolute inset-0"
              animate={{
                backgroundImage: [
                  'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.3) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 50%, rgba(255, 202, 64, 0.3) 0%, transparent 50%)',
                  'radial-gradient(circle at 50% 80%, rgba(255, 202, 64, 0.3) 0%, transparent 50%)',
                  'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.3) 0%, transparent 50%)',
                ]
              }}
              transition={{ duration: 10, repeat: Infinity }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Urgency Badge */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6B9D]/20 to-[#FF8FAB]/20 backdrop-blur-sm rounded-full border border-[#FF6B9D]/30 mb-8"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🔥
              </motion.span>
              <span className="text-white font-semibold">
                <span className="text-[#FFCA40]">500+ students</span> helped this week
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
            >
              You Are Not Alone.<br />
              <span className="bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFCA40] bg-clip-text text-transparent">
                Start Your Journey Today.
              </span>
            </motion.h2>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
            >
              Millions of students worldwide go through the same thing. But now, you have Aika. 
              An AI companion available 24/7, empathetic, and evidence-based.
            </motion.p>

            {/* Primary CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
            >
              <Link href="/aika">
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: "0 25px 70px rgba(255, 202, 64, 0.6)" 
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-16 py-6 bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFB700] text-[#001D58] rounded-full font-bold text-2xl flex items-center justify-center shadow-2xl transition-all overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Start Chatting Now
                    <motion.span
                      animate={{ x: [0, 8, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <FaArrowRight />
                    </motion.span>
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-[#FFB700] to-[#FFCA40]"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust Signals */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-white font-medium">No Sign-up Required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-white font-medium">Free Forever</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-white font-medium">100% Private & Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-white font-medium">Response {'<2s'}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Emergency Resources Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 bg-gradient-to-r from-[#FF6B9D]/10 to-[#FF8FAB]/10 backdrop-blur-xl rounded-3xl p-8 border border-[#FF6B9D]/30"
        >
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-4">
              🚨 In an Emergency?
            </h3>
            <p className="text-gray-400 mb-6">
              If you or a friend are in crisis, contact these emergency services:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <a 
                href="tel:+62274555555" 
                className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/20"
              >
                <div className="text-[#FF6B9D] font-bold text-lg mb-1">UGM Crisis Line</div>
                <div className="text-white text-sm">(0274) 555-555</div>
              </a>
              <a 
                href="tel:119" 
                className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/20"
              >
                <div className="text-[#FF6B9D] font-bold text-lg mb-1">SEJIWA</div>
                <div className="text-white text-sm">Dial 119</div>
              </a>
              <a 
                href="tel:112" 
                className="px-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/20"
              >
                <div className="text-[#FF6B9D] font-bold text-lg mb-1">Emergency</div>
                <div className="text-white text-sm">Dial 112</div>
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Crisis Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
        className="fixed bottom-8 right-8 z-50"
      >
        <Link href="/resources">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-4 bg-gradient-to-r from-[#FF6B9D] to-[#FF8FAB] text-white rounded-full font-bold shadow-2xl flex items-center gap-2 group"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🆘
            </motion.span>
            <span className="group-hover:mr-2 transition-all">Need Help Now?</span>
          </motion.button>
        </Link>
      </motion.div>
    </section>
  );
}
