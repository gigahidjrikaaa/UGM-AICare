"use client";

import { motion } from 'framer-motion';
import { StarburstGlyph, HeartPathGlyph, ShieldWaveGlyph } from '@/components/landing/CustomGlyphs';
import { useI18n } from '@/i18n/I18nProvider';

const capabilities = [
  {
    tag: "Early detection",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    title: "Notices when things drift",
    text: "Aika looks for patterns across your conversations and check-ins. When risk signals look serious, a campus counselor is alerted through a reviewed escalation flow — you're not on your own with it.",
  },
  {
    tag: "Everyday tools",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "Small practices that add up",
    text: "Guided breathing, journaling with mood analytics, daily quests, and follow-ups on the plans you make with Aika — small, consistent steps that fit between classes.",
  },
  {
    tag: "Private by design",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    title: "Your data stays yours",
    text: "Insights are computed with differential privacy, your AI memory is encrypted, and every consent (research, data sharing, proactive messages) is yours to toggle or revoke in your profile.",
  },
];

export default function TestimonialsSection() {
  const { t } = useI18n();

  return (
    <section className="min-h-screen flex flex-col justify-center py-20 bg-transparent relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">

        {/* Section Header - Side by Side on Large Screens */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
            <div className="max-w-2xl">
                <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 leading-tight">
                    {t('landing.stories.title', 'Built to keep you ahead of')} <br/>
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FFCA40] to-[#FFD770]">
                        {t('landing.stories.highlight', 'campus stress.')}
                    </span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                    {t('landing.stories.subtitle', "Here's honestly what Aika does today — no inflated claims, just the features your student wellness fee is going toward.")}
                </p>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Free for UGM students
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
                    Campus counseling integrated
                </span>
            </div>
        </div>

        {/* Capability Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">

          {capabilities.map((capability, index) => (
            <motion.div
              key={capability.tag}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`bg-[#021029]/60 backdrop-blur-md p-8 rounded-4xl border border-white/5 hover:bg-[#021029]/80 transition-colors flex flex-col ${index === 0 ? 'md:col-span-2 lg:col-span-1 bg-linear-to-br from-[#1A2942]/80 to-[#021029]/80 backdrop-blur-xl border-white/10 hover:border-[#FFCA40]/30' : ''}`}
            >
              <div className="flex items-center justify-between mb-6">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${capability.color}`}>
                      <StarburstGlyph className="w-3 h-3" />
                      {capability.tag}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                      {index === 1 ? <HeartPathGlyph className="w-4 h-4" /> : <ShieldWaveGlyph className="w-4 h-4" />}
                  </div>
              </div>

              <h3 className="text-white font-bold text-lg mb-3">{capability.title}</h3>
              <p className="text-slate-300 text-base leading-relaxed grow">{capability.text}</p>
            </motion.div>
          ))}

        </div>

      </div>
    </section>
  );
}
