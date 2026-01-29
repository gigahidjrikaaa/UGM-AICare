"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FaArrowRight, FaStar } from '@/icons';
import ParticleBackground from '@/components/ui/ParticleBackground';
import { useI18n } from '@/i18n/I18nProvider';

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-linear-to-br from-[#000B1F] via-[#001D58] to-[#002A7A]">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop"
          alt="University campus"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#000B1F]/90 via-[#001D58]/80 to-[#002A7A]/90" />
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <ParticleBackground 
          count={shouldReduceMotion ? 0 : 30}
          colors={["#FFCA40", "#6A98F0", "#ffffff"]}
          minSize={1} 
          maxSize={6} 
          speed={0.35}
        />
      </div>
      
      {/* Animated Mesh Gradient */}
      <div className="absolute inset-0 z-0 opacity-30">
        <motion.div
          className="absolute inset-0"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.15) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 50%, rgba(106, 152, 240, 0.15) 0%, transparent 50%)',
                    'radial-gradient(circle at 50% 80%, rgba(255, 202, 64, 0.12) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 50%, rgba(255, 202, 64, 0.15) 0%, transparent 50%)',
                  ],
                }
          }
          transition={shouldReduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      {/* Hero Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-20 w-full py-16 lg:py-16">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center"
        >
          {/* Left Column - Content */}
          <div className="text-center lg:text-left space-y-7">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center justify-center lg:justify-start gap-2 text-xs sm:text-sm tracking-[0.18em] uppercase text-white/70"
            >
              <FaStar className="text-[#FFCA40]" />
              <span>
                {t('landing.hero.eyebrow', 'Made for UGM students')}
              </span>
            </motion.div>
            
            {/* Main Heading */}
            <div className="space-y-4">
              <motion.h1 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.12] tracking-tight"
              >
                {t('landing.hero.title_line1', 'When campus feels heavy,')}
                <br />
                <span className="relative inline-block mt-2">
                  <span className="relative z-10 bg-linear-to-r from-[#FFCA40] via-[#FFD770] to-[#FFCA40] bg-clip-text text-transparent">
                    {t('landing.hero.title_highlight', 'talk to Aika.')}
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
                    className="absolute bottom-0 left-0 right-0 h-3 bg-linear-to-r from-[#FFCA40]/30 to-[#FFB700]/30 blur-sm origin-left"
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
                  animate={shouldReduceMotion ? undefined : { scale: [1, 1.15, 1] }}
                  transition={shouldReduceMotion ? undefined : { duration: 2.4, repeat: Infinity }}
                  className="h-2 w-2 bg-[#4ADE80] rounded-full"
                />
                <span className="text-[#4ADE80] font-semibold text-base">
                  {t('landing.hero.availability', 'Open anytime')}
                </span>
              </motion.div>
            </div>
            
            {/* Description */}
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              {t(
                'landing.hero.description',
                "Aika helps you slow down, sort what's going on, and choose a next step. When you want professional support, Aika can help you reach UGM services."
              )}
            </motion.p>
            
            {/* Stats */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0"
            >
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-[#FFCA40]">24/7</div>
                <div className="text-xs text-gray-400">{t('landing.hero.kpi.anytime', 'Anytime')}</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-[#FFCA40]">UGM</div>
                <div className="text-xs text-gray-400">{t('landing.hero.kpi.ugm', 'Campus support pathways')}</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl font-bold text-[#FFCA40]">{t('landing.hero.kpi.private_value', 'Private')}</div>
                <div className="text-xs text-gray-400">{t('landing.hero.kpi.private_label', 'You control what you share')}</div>
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
                  className="group relative px-8 py-4 bg-linear-to-r from-[#FFCA40] via-[#FFD770] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg flex items-center justify-center shadow-2xl transition-all w-full sm:w-auto overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {t('landing.hero.cta_primary', 'Start a conversation')}
                    <motion.span
                      animate={shouldReduceMotion ? undefined : { x: [0, 5, 0] }}
                      transition={shouldReduceMotion ? undefined : { repeat: Infinity, duration: 1.5 }}
                    >
                      <FaArrowRight />
                    </motion.span>
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-linear-to-r from-[#FFB700] to-[#FFCA40]"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "0%" }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </Link>
              <Link href="/about">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-7 py-4 bg-white/5 backdrop-blur-sm border border-white/20 text-white rounded-full font-semibold text-base hover:bg-white/10 transition-all w-full sm:w-auto"
                >
                  {t('landing.hero.cta_secondary', 'Learn how it works')}
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
                <span>{t('landing.hero.trust.no_signup', 'No sign-up required')}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>{t('landing.hero.trust.privacy', 'Privacy-first by design')}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>{t('landing.hero.trust.ugm', 'Connected to UGM support services')}</span>
              </div>
            </motion.div>
          </div>
          
          {/* Right Column - Aika Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block lg:scale-95 xl:scale-100 origin-center"
          >
            {/* Main Chat Preview Card */}
            <div className="relative">
              {/* Glow Effect */}
              <motion.div
                className="absolute -inset-4 bg-linear-to-r from-[#FFCA40]/20 via-[#6A98F0]/20 to-[#FF6B9D]/20 rounded-3xl blur-2xl"
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        opacity: [0.28, 0.45, 0.28],
                        scale: [1, 1.02, 1],
                      }
                }
                transition={shouldReduceMotion ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Chat Interface Preview */}
              <div className="relative bg-linear-to-br from-[#0a1628] to-[#001D58] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                {/* Chat Header */}
                <div className="bg-white/5 backdrop-blur-sm px-5 py-3 border-b border-white/10 flex items-center gap-4">
                  <div className="relative">
                    <Image
                      src="/aika-human.jpeg"
                      alt="Aika Avatar"
                      width={44}
                      height={44}
                      className="rounded-full border-2 border-[#FFCA40]"
                    />
                    <motion.div
                      animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                      transition={shouldReduceMotion ? undefined : { duration: 2, repeat: Infinity }}
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#4ADE80] rounded-full border-2 border-[#0a1628]"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Aika</h3>
                    <p className="text-[#4ADE80] text-sm">{t('landing.hero.preview.status', 'Ready to chat')}</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-5 space-y-4 min-h-65">
                  {/* Aika Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <Image
                        src="/aika-human.jpeg"
                        alt="Aika"
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                      <p className="text-white text-sm">
                        {t(
                          'landing.hero.preview.msg1',
                          "Hi, I'm Aika. Want to tell me what's been on your mind lately?"
                        )}
                      </p>
                    </div>
                  </motion.div>

                  {/* User Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 }}
                    className="flex gap-3 justify-end"
                  >
                    <div className="bg-[#FFCA40] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                      <p className="text-[#001D58] text-sm font-medium">
                        {t('landing.hero.preview.user_msg', "I've been feeling overwhelmed with my thesis lately...")}
                      </p>
                    </div>
                  </motion.div>

                  {/* Aika Response */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.5 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <Image
                        src="/aika-human.jpeg"
                        alt="Aika"
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                      <p className="text-white text-sm">
                        {t(
                          'landing.hero.preview.msg2',
                          "That sounds exhausting. Before we solve it, can we name what's weighing on you the most right now?"
                        )}
                      </p>
                    </div>
                  </motion.div>

                  {/* Typing Indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <Image
                        src="/aika-human.jpeg"
                        alt="Aika"
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3">
                      <motion.div
                        className="flex gap-1"
                        animate={shouldReduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                        transition={shouldReduceMotion ? undefined : { duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-2 h-2 bg-white/50 rounded-full" />
                        <div className="w-2 h-2 bg-white/50 rounded-full" />
                        <div className="w-2 h-2 bg-white/50 rounded-full" />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                {/* Input Area */}
                <div className="bg-white/5 backdrop-blur-sm px-4 py-3 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-white/50 text-sm">
                      {t('landing.hero.preview.input_placeholder', 'Type your message...')}
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-10 h-10 rounded-full bg-[#FFCA40] flex items-center justify-center cursor-pointer"
                    >
                      <svg className="w-5 h-5 text-[#001D58]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-2xl"
            >
              <div className="text-2xl font-bold text-[#FFCA40] mb-1">73%</div>
              <div className="text-sm text-gray-300">Indonesian students<br/>experience academic stress</div>
            </motion.div>

            {/* Floating Feature Badge */}
            <div className="absolute -top-3 -right-3 text-xs font-semibold text-white/70">
              {t('landing.hero.preview.badge', 'Guided exercises')}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 z-20"
      >
        <span className="text-xs uppercase tracking-widest">{t('landing.hero.scroll', 'Scroll to explore')}</span>
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={shouldReduceMotion ? undefined : { duration: 1.5, repeat: Infinity }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
