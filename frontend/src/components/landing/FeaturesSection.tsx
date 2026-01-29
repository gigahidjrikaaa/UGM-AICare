"use client";

import { motion } from 'framer-motion';
import { 
  FiMessageCircle, 
  FiShield, 
  FiUsers, 
  FiActivity, 
  FiBookOpen, 
  FiAward,
  FiTarget,
  FiHeart
} from '@/icons';
import { useI18n } from '@/i18n/I18nProvider';

const features = [
  {
    icon: FiMessageCircle,
    titleKey: 'landing.features.f1.title',
    titleFallback: 'Talk it out',
    descriptionKey: 'landing.features.f1.desc',
    descriptionFallback: 'Aika helps you put feelings into words and reflect without judgment.',
    color: "from-[#FFCA40] to-[#FFB700]"
  },
  {
    icon: FiShield,
    titleKey: 'landing.features.f2.title',
    titleFallback: 'Safety prompts',
    descriptionKey: 'landing.features.f2.desc',
    descriptionFallback: 'When messages suggest risk, Aika prioritizes safety and surfaces crisis resources.',
    color: "from-[#FF6B9D] to-[#FF8FAB]"
  },
  {
    icon: FiUsers,
    titleKey: 'landing.features.f3.title',
    titleFallback: 'UGM support pathways',
    descriptionKey: 'landing.features.f3.desc',
    descriptionFallback: "Guidance toward campus services (GMC/HPU), and help preparing what to share.",
    color: "from-[#6A98F0] to-[#8AABF5]"
  },
  {
    icon: FiActivity,
    titleKey: 'landing.features.f4.title',
    titleFallback: 'Check-ins & journaling',
    descriptionKey: 'landing.features.f4.desc',
    descriptionFallback: 'Quick check-ins and notes that help you see patterns over time.',
    color: "from-[#4ADE80] to-[#6EE7A0]"
  },
  {
    icon: FiBookOpen,
    titleKey: 'landing.features.f5.title',
    titleFallback: 'Resources that match the moment',
    descriptionKey: 'landing.features.f5.desc',
    descriptionFallback: 'Coping tools, self-help guides, and campus resources in one place.',
    color: "from-[#A78BFA] to-[#C4B5FD]"
  },
  {
    icon: FiAward,
    titleKey: 'landing.features.f6.title',
    titleFallback: 'Badges & small wins',
    descriptionKey: 'landing.features.f6.desc',
    descriptionFallback: 'Lightweight motivation for habits, routines, and self-care streaks.',
    color: "from-[#F97316] to-[#FB923C]"
  },
  {
    icon: FiTarget,
    titleKey: 'landing.features.f7.title',
    titleFallback: 'Goals you can keep',
    descriptionKey: 'landing.features.f7.desc',
    descriptionFallback: 'Set a goal, pick a next step, and come back when you’re ready.',
    color: "from-[#14B8A6] to-[#2DD4BF]"
  },
  {
    icon: FiHeart,
    titleKey: 'landing.features.f8.title',
    titleFallback: 'Human support, when you want it',
    descriptionKey: 'landing.features.f8.desc',
    descriptionFallback: 'Aika can point you toward people and services, not just more text.',
    color: "from-[#EC4899] to-[#F472B6]"
  }
];

export default function FeaturesSection() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-linear-to-b from-[#000B1F] via-[#001D58] to-[#000B1F] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-[#FFCA40] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-[#6A98F0] rounded-full blur-3xl" />
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
            {t('landing.features.eyebrow', 'What you can do')}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            {t('landing.features.title_prefix', 'Support for')}{' '}
            <span className="bg-linear-to-r from-[#FFCA40] to-[#FFD770] bg-clip-text text-transparent">
              {t('landing.features.title_highlight', 'mental wellness')}
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {t(
              'landing.features.subtitle',
              'From quick check-ins to preparing for counseling, Aika helps you take the next step without overwhelming you.'
            )}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all h-full relative overflow-hidden">
                {/* Gradient Overlay on Hover */}
                <motion.div
                  className={`absolute inset-0 bg-linear-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />
                
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: -4, scale: 1.06 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                  className={`w-12 h-12 rounded-xl bg-linear-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="text-white text-xl" />
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-bold text-white mb-2 relative z-10">
                  {t(feature.titleKey, feature.titleFallback)}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                  {t(feature.descriptionKey, feature.descriptionFallback)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-gray-400 mb-4">
            {t('landing.features.footer', 'And more features designed with student life in mind.')}
          </p>
          <motion.a
            href="/about"
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 text-[#FFCA40] font-semibold hover:text-[#FFD770] transition-colors"
          >
            {t('landing.features.link', 'Learn about the approach')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
