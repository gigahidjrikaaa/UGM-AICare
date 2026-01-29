"use client";

import { motion } from 'framer-motion';
import { FiCheckCircle, FiZap, FiHeart, FiUsers } from '@/icons';
import { useI18n } from '@/i18n/I18nProvider';

const benefits = [
  {
    icon: FiZap,
    titleKey: 'landing.benefits.card1.title',
    titleFallback: 'Safety-minded support',
    descriptionKey: 'landing.benefits.card1.desc',
    descriptionFallback:
      'If your messages suggest you may be in danger, Aika prioritizes safety: it can surface crisis resources and encourage reaching out to real people.',
    color: "from-[#FF6B9D] to-[#FF8FAB]",
    features: [
      { key: 'landing.benefits.card1.f1', fallback: 'Crisis resources when needed' },
      { key: 'landing.benefits.card1.f2', fallback: 'Grounding prompts to stabilize' },
      { key: 'landing.benefits.card1.f3', fallback: 'Encourages contacting support' },
      { key: 'landing.benefits.card1.f4', fallback: 'Clear next-step options' },
    ],
  },
  {
    icon: FiHeart,
    titleKey: 'landing.benefits.card2.title',
    titleFallback: 'Small steps, tailored to you',
    descriptionKey: 'landing.benefits.card2.desc',
    descriptionFallback:
      'You can ask for practical coping techniques and a plan you can actually try today, not a generic list of advice.',
    color: "from-[#FFCA40] to-[#FFD770]",
    features: [
      { key: 'landing.benefits.card2.f1', fallback: 'CBT-inspired exercises' },
      { key: 'landing.benefits.card2.f2', fallback: 'Step-by-step guidance' },
      { key: 'landing.benefits.card2.f3', fallback: 'Journaling and reflections' },
      { key: 'landing.benefits.card2.f4', fallback: 'Personal goals you can revisit' },
    ],
  },
  {
    icon: FiUsers,
    titleKey: 'landing.benefits.card3.title',
    titleFallback: 'Bridge to campus support',
    descriptionKey: 'landing.benefits.card3.desc',
    descriptionFallback:
      "When it's time to talk with a professional, Aika can guide you toward UGM services and help you prepare what to say.",
    color: "from-[#6A98F0] to-[#8AABF5]",
    features: [
      { key: 'landing.benefits.card3.f1', fallback: 'UGM service pathways (GMC/HPU)' },
      { key: 'landing.benefits.card3.f2', fallback: 'Helps you summarize your situation' },
      { key: 'landing.benefits.card3.f3', fallback: 'Encourages reaching out early' },
      { key: 'landing.benefits.card3.f4', fallback: 'Optional, based on your needs' },
    ],
  }
];

export default function BenefitsSection() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-linear-to-b from-[#001D58] via-[#002A7A] to-[#000B1F] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#FFCA40] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[#6A98F0] rounded-full blur-3xl" />
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
            {t('landing.benefits.eyebrow', 'Why students use Aika')}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            {t('landing.benefits.title_line1', 'Not a lecture.')}
            <br />
            <span className="text-[#FFCA40]">{t('landing.benefits.title_line2', 'A place to start.')}</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {t(
              'landing.benefits.subtitle',
              'Designed for UGM students: practical support now, and a clear path to professional help when you want it.'
            )}
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10, scale: 1.02, transition: { duration: 0.3 } }}
              className="relative group"
            >
              {/* Card */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl h-full relative overflow-hidden">
                {/* Gradient Overlay on Hover */}
                <motion.div
                  className={`absolute inset-0 bg-linear-to-br ${benefit.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Icon */}
                <div className="relative">
                  <motion.div
                    whileHover={{ rotate: -6, scale: 1.06 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                    className={`w-16 h-16 rounded-2xl bg-linear-to-br ${benefit.color} flex items-center justify-center mb-6 shadow-lg`}
                  >
                    <benefit.icon className="text-white text-2xl" />
                  </motion.div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 relative">
                  {t(benefit.titleKey, benefit.titleFallback)}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed mb-6 relative">
                  {t(benefit.descriptionKey, benefit.descriptionFallback)}
                </p>

                {/* Features List */}
                <div className="space-y-3 relative">
                  {benefit.features.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2 + featureIndex * 0.1 }}
                      className="flex items-center gap-3 text-sm text-gray-300"
                    >
                      <FiCheckCircle className={`text-[#4ADE80] shrink-0`} />
                      <span>{t(feature.key, feature.fallback)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Expectations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-linear-to-r from-[#FFCA40]/10 via-[#FFD770]/10 to-[#FFCA40]/10 backdrop-blur-xl rounded-3xl p-12 border border-[#FFCA40]/30"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: What you can expect */}
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                {t('landing.benefits.expectations.title', 'What to expect')}
              </h3>

              <ul className="space-y-3 text-gray-300">
                {[
                  { key: 'landing.benefits.expectations.p1', fallback: 'A calm space to write what you feel, without judgment.' },
                  { key: 'landing.benefits.expectations.p2', fallback: 'Practical coping tools you can try immediately.' },
                  { key: 'landing.benefits.expectations.p3', fallback: 'A way to prepare for counseling (notes, goals, questions).' },
                  { key: 'landing.benefits.expectations.p4', fallback: 'Crisis resources surfaced when safety is a concern.' },
                ].map((item) => (
                  <li key={item.key} className="flex items-start gap-3">
                    <FiCheckCircle className="text-[#4ADE80] mt-0.5 shrink-0" />
                    <span>{t(item.key, item.fallback)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: What Aika is not */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="text-white font-semibold mb-3">
                {t('landing.benefits.not_title', "What Aika isn't")}
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {[
                  { key: 'landing.benefits.not1', fallback: 'Not a substitute for medical or psychiatric care.' },
                  { key: 'landing.benefits.not2', fallback: 'Not guaranteed to be accurate; always use your judgment.' },
                  { key: 'landing.benefits.not3', fallback: 'Not a replacement for emergency services in life-threatening situations.' },
                ].map((item) => (
                  <li key={item.key} className="flex items-start gap-3">
                    <span className="mt-0.5 text-white/30">•</span>
                    <span>{t(item.key, item.fallback)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-4">
                {t(
                  'landing.benefits.not_note',
                  'If you are in immediate danger, contact emergency services (112) or the nearest health facility.'
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
