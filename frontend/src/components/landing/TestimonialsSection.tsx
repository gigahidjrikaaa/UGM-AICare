"use client";

import { motion } from 'framer-motion';
import { StarburstGlyph } from '@/components/landing/CustomGlyphs';
import { useI18n } from '@/i18n/I18nProvider';

const testimonials = [
  {
    name: "Rania A.",
    role: "Civil Engineering '22",
    rating: 5,
    text: "I used it late at night directly. The grounding steps helped me sleep, then I booked a counselor the next day.",
    tag: "Thesis Stress"
  },
  {
    name: "Dinda K.",
    role: "Psychology '23",
    rating: 5,
    text: "Homesickness was heavy. Aika helped me name what I felt and figure out one small thing to do.",
    tag: "Homesick"
  },
  {
    name: "Maya P.",
    role: "Economics '23",
    rating: 5,
    text: "I like that I can keep things private. When I needed help, it pointed me to the right UGM service.",
    tag: "Privacy"
  }
];

export default function TestimonialsSection() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-transparent relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            {t('landing.stories.title_prefix', 'How Aika can')} <span className="text-[#FFCA40]">{t('landing.stories.title_highlight', 'help')}</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            {t('landing.stories.subtitle', 'Real scenarios from students who needed a moment to breathe.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => (
             <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#021029] p-8 rounded-3xl border border-white/5 flex flex-col items-start hover:border-white/10 transition-colors"
             >
                <div className="mb-6 flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFCA40]/10 border border-[#FFCA40]/20 text-[#FFCA40] text-xs font-medium">
                   <StarburstGlyph className="w-3 h-3" />
                   {item.tag}
                </div>
                <p className="text-xl text-slate-300 mb-6 leading-relaxed">"{item.text}"</p>
                <div className="mt-auto flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                      {item.name.charAt(0)}
                   </div>
                   <div>
                      <div className="text-white font-semibold">{item.name}</div>
                      <div className="text-slate-500 text-sm">{item.role}</div>
                   </div>
                </div>
             </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
