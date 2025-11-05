"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaArrowRight, FaStar } from '@/icons';
import ParticleBackground from '@/components/ui/ParticleBackground';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#000B1F] via-[#001D58] to-[#002A7A]">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <ParticleBackground 
          count={50} 
          colors={["#FFCA40", "#6A98F0", "#ffffff", "#FF6B9D", "#4ADE80"]} 
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
      
      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 w-full py-20">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
        >
          {/* Left Column - Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Badge */}
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
                Dipercaya oleh <span className="text-[#FFCA40] font-bold">2000+ Mahasiswa UGM</span>
              </span>
            </motion.div>
            
            {/* Main Heading */}
            <div className="space-y-4">
              <motion.h1 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight"
              >
                Lagi Stress?
                <br />
                <span className="relative inline-block mt-2">
                  <span className="relative z-10 bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFCA40] bg-clip-text text-transparent">
                    Chat Aja ke Aika
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
                    className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-[#FFCA40]/30 to-[#FFB700]/30 blur-sm origin-left"
                  />
                </span>
              </motion.h1>
              
              {/* Online Indicator */}
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
                <span className="text-[#4ADE80] font-semibold text-lg">Online 24/7</span>
              </motion.div>
            </div>
            
            {/* Description */}
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl sm:text-2xl text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Kenalan sama <span className="text-[#FFCA40] font-bold">Aika</span> – teman AI kamu yang siap dengerin keluh kesah. 
              Dapetin dukungan instan, solusi personal, dan langsung connect ke konselor profesional UGM.
            </motion.p>
            
            {/* Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0"
            >
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-[#FFCA40]">2000+</div>
                <div className="text-sm text-gray-400">Mahasiswa UGM</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-[#FFCA40]">{'<2s'}</div>
                <div className="text-sm text-gray-400">Waktu Respons</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-[#FFCA40]">4.8★</div>
                <div className="text-sm text-gray-400">Rating</div>
              </div>
            </motion.div>
            
            {/* CTA Buttons */}
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
                  className="group relative px-12 py-5 bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFB700] text-[#001D58] rounded-full font-bold text-xl flex items-center justify-center shadow-2xl transition-all w-full sm:w-auto overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Mulai Chat Sekarang - Gratis
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
            </motion.div>

            {/* Trust Signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-400"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Tanpa Daftar</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>100% Privasi Terjamin</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Terhubung ke GMC UGM</span>
              </div>
            </motion.div>
          </div>
          
          {/* Right Column - Video/Visual Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#FFCA40]/30">
              {/* Placeholder for Demo Video */}
              <div className="aspect-[9/16] bg-gradient-to-br from-[#001D58] to-[#002A7A] flex items-center justify-center relative">
                {/* Video Placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-[#FFCA40]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">Lihat Demo Aika</h3>
                  <p className="text-gray-400">Video showcase coming soon</p>
                </div>
                
                {/* Animated Border */}
                <motion.div
                  className="absolute inset-0 border-4 border-[#FFCA40]"
                  animate={{ 
                    borderRadius: ["20% 80% 70% 30% / 20% 30% 70% 80%", "80% 20% 30% 70% / 70% 80% 20% 30%", "20% 80% 70% 30% / 20% 30% 70% 80%"]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ filter: "blur(20px)", opacity: 0.3 }}
                />
              </div>
            </div>
            
            {/* Floating Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute -bottom-6 -right-6 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl"
            >
              <div className="text-4xl font-bold text-[#FFCA40] mb-1">73%</div>
              <div className="text-sm text-gray-300">Mahasiswa Indonesia<br/>alami stress akademik</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
