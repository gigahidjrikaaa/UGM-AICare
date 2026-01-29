"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowScribbleGlyph, StarburstGlyph } from '@/components/landing/CustomGlyphs';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { useI18n } from '@/i18n/I18nProvider';

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 50, damping: 20 }
  }
};

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const { t } = useI18n();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#000B1F]">
      
      {/* 1. Background Layers */}
      {/* Subtle Image Backdrop */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop"
          alt="University campus support"
          fill
          className="object-cover opacity-10 mix-blend-luminosity"
          priority
        />
        {/* Solid overlay to ensure text readability */}
        <div className="absolute inset-0 bg-[#000B1F]/90" />
      </div>

      {/* Particle System - kept subtle */}
      <div className="absolute inset-0 z-0 pointer-events-none h-[120vh]">
        <ParticleBackground 
          count={shouldReduceMotion ? 0 : 25}
          colors={["#FFCA40", "#4ADE80", "#ffffff"]}
          minSize={1} 
          maxSize={4} 
          speed={0.2}
        />
      </div>

      {/* Grid Pattern Overlay for "Tech/Structural" feel */}
      <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem] h-[200vh]" />

      {/* 2. Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 w-full pt-20 pb-16 lg:pt-32 lg:pb-24">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
        >
          {/* Left Column: Typography & CTA */}
          <div className="text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
            
            {/* Status Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center justify-center lg:justify-start">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ADE80]"></span>
                </span>
                <span className="text-xs font-medium text-[#4ADE80] uppercase tracking-wider">
                  {t('landing.hero.status', 'System Online • 24/7')}
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <div className="space-y-4">
              <motion.h1 
                variants={itemVariants}
                className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight"
              >
                {t('landing.hero.title_line1', 'Your mental health,')}
                <br />
                <span className="text-[#FFCA40]">
                  {t('landing.hero.title_highlight', 'proactively managed.')}
                </span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-lg mx-auto lg:mx-0 font-light"
              >
                {t(
                  'landing.hero.description',
                  "Aika is an intelligent agent designed for UGM students. It helps you unpack your thoughts, find coping mechanisms, and connect with professional help when you're ready."
                )}
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4"
            >
              <Link href="/aika" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4 bg-[#FFCA40] text-[#000B1F] rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(255,202,64,0.3)] hover:shadow-[0_0_30px_rgba(255,202,64,0.5)] transition-all flex items-center justify-center gap-2"
                >
                  {t('landing.hero.cta_primary', 'Chat with Aika')}
                  <ArrowScribbleGlyph className="w-5 h-5" />
                </motion.button>
              </Link>
              
              <Link href="/about" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/5 transition-all"
                >
                  {t('landing.hero.cta_secondary', 'How it works')}
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust Signal Mini */}
            <motion.div variants={itemVariants} className="pt-4 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-400">
               <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#000B1F] bg-slate-700 overflow-hidden relative">
                       <Image src={`https://randomuser.me/api/portraits/thumb/men/${i+10}.jpg`} alt="User" fill className="object-cover" />
                    </div>
                  ))}
               </div>
               <p>{t('landing.hero.social_proof', 'Trusted by 500+ UGM Students')}</p>
            </motion.div>

          </div>
          
          {/* Right Column: Interaction Preview */}
          <motion.div
            variants={itemVariants}
            className="relative hidden lg:block"
          >
            {/* Abstract Decorative Elements behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#4ADE80]/5 rounded-full blur-3xl" />
            
            <div className="relative mx-auto max-w-[380px] bg-[#021029] rounded-[2.5rem] border-4 border-[#1a2d4d] shadow-2xl overflow-hidden aspect-[9/18]">
               {/* Phone Notch */}
               <div className="absolute top-0 inset-x-0 h-6 bg-[#1a2d4d] z-20 flex justify-center">
                  <div className="w-32 h-4 bg-[#000B1F] rounded-b-2xl" />
               </div>

               {/* Chat UI Header */}
               <div className="bg-[#0B1A36] p-6 pt-10 border-b border-white/5 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[#FFCA40] p-0.5 relative">
                    <Image src="/aika-human.jpeg" alt="Aika" width={40} height={40} className="rounded-full object-cover h-full w-full" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4ADE80] border-2 border-[#0B1A36] rounded-full"></div>
                 </div>
                 <div>
                    <div className="font-bold text-white text-sm">Aika Assistant</div>
                    <div className="text-[#4ADE80] text-xs">Replies instantly</div>
                 </div>
               </div>

               {/* Messages Area */}
               <div className="p-4 space-y-4 bg-[#000B1F] h-full">
                  <div className="flex gap-2">
                    <div className="max-w-[85%] bg-[#0B1A36] rounded-2xl rounded-tl-sm p-3 border border-white/5">
                      <p className="text-slate-300 text-sm">Hi there! 👋 School can get overwhelming. How are you feeling today?</p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <div className="max-w-[85%] bg-[#FFCA40] rounded-2xl rounded-tr-sm p-3">
                      <p className="text-[#000B1F] text-sm font-medium">Honestly, I'm stressed about my thesis defense next week.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                     <div className="w-8 h-8 rounded-full bg-[#0B1A36] overflow-hidden shrink-0 mt-auto">
                        <Image src="/aika-human.jpeg" alt="Aika" width={32} height={32} />
                     </div>
                     <div className="max-w-[85%]">
                        <div className="bg-[#0B1A36] rounded-2xl rounded-tl-sm p-3 border border-white/5 mb-2">
                           <p className="text-slate-300 text-sm">That's completely understandable. It's a huge milestone. What's the biggest worry right now? The content, or the presentation itself?</p>
                        </div>
                        <div className="flex gap-2 text-xs">
                           <button className="px-3 py-1.5 rounded-full bg-[#0B1A36] border border-[#FFCA40]/30 text-[#FFCA40] hover:bg-[#FFCA40]/10 transition">The presentation</button>
                           <button className="px-3 py-1.5 rounded-full bg-[#0B1A36] border border-white/10 text-slate-400 hover:bg-white/5 transition">The content</button>
                        </div>
                     </div>
                  </div>
                  
                  {/* Floating Action within Phone */}
                  <div className="absolute bottom-6 left-4 right-4">
                     <div className="h-12 bg-[#0B1A36] rounded-xl border border-white/10 flex items-center px-4 justify-between">
                        <span className="text-slate-500 text-sm">Type a message...</span>
                        <div className="w-8 h-8 bg-[#FFCA40] rounded-full flex items-center justify-center">
                           <ArrowScribbleGlyph className="w-4 h-4 text-[#000B1F]" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}