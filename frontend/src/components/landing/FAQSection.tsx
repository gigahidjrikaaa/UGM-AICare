"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiChevronDown } from '@/icons';
import { useI18n } from '@/i18n/I18nProvider';

const faqs = [
  {
    qKey: 'landing.faq.q1',
    qFallback: 'Does Aika replace professional counselors?',
    aKey: 'landing.faq.a1',
    aFallback:
      "No. Aika is a first step: a place to reflect, try coping tools, and prepare to talk to a human counselor. If you want professional help, Aika can guide you toward campus services."
  },
  {
    qKey: 'landing.faq.q2',
    qFallback: "What if I'm in crisis?",
    aKey: 'landing.faq.a2',
    aFallback:
      'If you feel at risk of harming yourself or others, please treat it as urgent. Use emergency services (112), SEJIWA (119), or contact UGM support resources. Aika can surface crisis resources and grounding steps, but it is not a substitute for emergency care.'
  },
  {
    qKey: 'landing.faq.q3',
    qFallback: 'What about privacy and data?',
    aKey: 'landing.faq.a3',
    aFallback:
      'UGM-AICare is designed with privacy in mind. We minimize data collection and aim to protect conversations with standard security practices. If you choose to share information for counseling or follow-up, that is opt-in. You can request deletion of your data.'
  },
  {
    qKey: 'landing.faq.q4',
    qFallback: 'Is it free for students?',
    aKey: 'landing.faq.a4',
    aFallback:
      'UGM-AICare is intended as a student support platform. Access and eligibility depend on the current UGM program or deployment. The product should not require payment to start a conversation.'
  },
  {
    qKey: 'landing.faq.q5',
    qFallback: 'What makes Aika different?',
    aKey: 'landing.faq.a5',
    aFallback:
      "It's built around UGM student life: it focuses on practical next steps, supports journaling and check-ins, and helps you reach campus support services when you want to talk to a professional."
  }
];

export default function FAQSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const { t } = useI18n();

  return (
    <section className="py-24 bg-linear-to-b from-[#001D58] to-[#000B1F] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FFCA40] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#6A98F0] rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-white/60 text-sm uppercase tracking-widest mb-4">
            {t('landing.faq.eyebrow', 'FAQ')}
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            {t('landing.faq.title_line1', 'Got questions?')}
            <br />
            <span className="text-[#FFCA40]">{t('landing.faq.title_line2', 'Here are quick answers.')}</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t('landing.faq.subtitle', 'A few things students often ask before trying Aika.')}
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {(() => {
                const expanded = activeIndex === index;
                const contentId = `landing-faq-panel-${index}`;
                const buttonId = `landing-faq-button-${index}`;

                return (
              <button
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                id={buttonId}
                aria-expanded={expanded}
                aria-controls={contentId}
                className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-lg hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-[#FFCA40] transition-colors flex-1">
                    {t(faq.qKey, faq.qFallback)}
                  </h3>
                  <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0"
                  >
                    <FiChevronDown className="text-[#FFCA40] text-2xl" />
                  </motion.div>
                </div>
                
                <motion.div
                  initial={false}
                  animate={{ 
                    height: expanded ? "auto" : 0,
                    opacity: expanded ? 1 : 0,
                    marginTop: expanded ? 16 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                  id={contentId}
                  role="region"
                  aria-labelledby={buttonId}
                >
                  <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                    {t(faq.aKey, faq.aFallback)}
                  </p>
                </motion.div>
              </button>
                );
              })()}
            </motion.div>
          ))}
        </div>

        {/* Additional Resources */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 bg-linear-to-r from-[#FFCA40]/10 via-[#FFD770]/10 to-[#FFCA40]/10 backdrop-blur-xl rounded-3xl p-8 border border-[#FFCA40]/30"
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              {t('landing.faq.more_title', 'Still have questions?')}
            </h3>
            <p className="text-gray-400 mb-6">
              {t('landing.faq.more_subtitle', 'Talk to Aika or reach out to the support team.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@ugm-aicare.id" 
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                📧 support@ugm-aicare.id
              </a>
              <a 
                href="tel:+62274555555" 
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                📞 (0274) 555-555
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
