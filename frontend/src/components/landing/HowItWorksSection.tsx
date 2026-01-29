"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaArrowRight } from '@/icons';
import { useI18n } from '@/i18n/I18nProvider';

const steps = [
  {
    number: "01",
    emoji: "💬",
    titleKey: 'landing.how.steps.s1.title',
    titleFallback: 'Start a chat',
    descriptionKey: 'landing.how.steps.s1.desc',
    descriptionFallback: "Open Aika and write what's going on. You can keep it short, or say a lot."
  },
  {
    number: "02",
    emoji: "🤝",
    titleKey: 'landing.how.steps.s2.title',
    titleFallback: 'Find a next step',
    descriptionKey: 'landing.how.steps.s2.desc',
    descriptionFallback: 'Aika helps you name the problem, try a coping tool, and choose one small action.'
  },
  {
    number: "03",
    emoji: "👨‍⚕️",
    titleKey: 'landing.how.steps.s3.title',
    titleFallback: 'Reach out when ready',
    descriptionKey: 'landing.how.steps.s3.desc',
    descriptionFallback: 'If you want professional support, Aika can guide you toward UGM services and help you prepare.'
  }
];

export default function HowItWorksSection() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-linear-to-b from-[#000B1F] to-[#001D58] relative overflow-hidden">
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
          <p className="text-white/60 text-sm uppercase tracking-widest mb-4">
            {t('landing.how.eyebrow', 'How it works')}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            {t('landing.how.title_line1', 'Simple.')}
            <br />
            <span className="text-[#FFCA40]">{t('landing.how.title_line2', 'Three steps.')}</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
            {t('landing.how.subtitle', 'Start small. You can stop anytime, or keep going.')}
          </p>
          <p className="text-sm text-white/60">
            {t('landing.how.note', 'No timers. No pressure. Just a conversation.')}
          </p>
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
                <div className="hidden lg:block absolute top-1/3 left-full w-full h-0.5 bg-linear-to-r from-[#FFCA40] to-transparent -z-10" />
              )}

              {/* Card */}
              <motion.div
                whileHover={{ y: -10, scale: 1.05, transition: { duration: 0.3 } }}
                className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl h-full relative overflow-hidden group"
              >
                {/* Gradient Overlay on Hover */}
                <motion.div
                  className="absolute inset-0 bg-linear-to-br from-[#FFCA40]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />

                {/* Step Number */}
                <div className="absolute top-8 right-8 text-6xl font-black text-white/5">
                  {step.number}
                </div>

                {/* Emoji */}
                <div className="text-6xl mb-4 relative z-10">
                  {step.emoji}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 relative z-10">
                  {t(step.titleKey, step.titleFallback)}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed relative z-10">
                  {t(step.descriptionKey, step.descriptionFallback)}
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
          className="bg-linear-to-r from-[#001D58] to-[#002A7A] rounded-3xl p-12 border-2 border-[#FFCA40]/30 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 grid-pattern" />
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Video Placeholder */}
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-linear-to-br from-[#000B1F] to-[#001D58] flex items-center justify-center relative overflow-hidden border-2 border-[#FFCA40]/20">
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
                  <p className="text-gray-400 text-sm">{t('landing.how.demo.subtitle', 'A short walkthrough is coming soon')}</p>
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
                {t('landing.how.cta.title_line1', 'Ready to try it?')}
                <br />
                <span className="text-[#FFCA40]">{t('landing.how.cta.title_line2', 'Start whenever you want')}</span>
              </h3>
              
              <div className="space-y-4 mb-8">
                {[
                  t('landing.how.cta.b1', '✓ No sign-up required'),
                  t('landing.how.cta.b2', '✓ Privacy-first by design'),
                  t('landing.how.cta.b3', '✓ Guided tools and reflections'),
                  t('landing.how.cta.b4', '✓ Campus support pathways (UGM)'),
                  t('landing.how.cta.b5', '✓ Open anytime')
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
                  className="group relative px-12 py-5 bg-linear-to-r from-[#FFCA40] via-[#FFD770] to-[#FFB700] text-[#001D58] rounded-full font-bold text-xl flex items-center justify-center shadow-2xl transition-all w-full sm:w-auto overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {t('landing.how.cta.button', 'Start a conversation')}
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
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
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
