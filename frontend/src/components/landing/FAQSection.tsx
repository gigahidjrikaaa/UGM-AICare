"use client";

import { motion } from 'framer-motion';
import { Disclosure } from '@headlessui/react';
import { CaretGlyph } from '@/components/landing/CustomGlyphs';
import { useI18n } from '@/i18n/I18nProvider';

const faqs = [
  {
    qKey: 'landing.faq.q1',
    qDefault: 'Does Aika replace professional counselors?',
    aKey: 'landing.faq.a1',
    aDefault: "No. Aika is a first step to reflect and copy, not a doctor. We guide you to UGM specialized services if needed."
  },
  {
    qKey: 'landing.faq.q2',
    qDefault: "Is my data safe?",
    aKey: 'landing.faq.a2',
    aDefault: 'Yes. Chats are private. We summarize your mental state for you, but raw logs are not shared without consent.'
  },
  {
    qKey: 'landing.faq.q3',
    qDefault: 'Is it free?',
    aKey: 'landing.faq.a3',
    aDefault: 'Yes, it is currently free for all active UGM students.'
  }
];

export default function FAQSection() {
  const { t } = useI18n();

  return (
    <section className="py-24 bg-transparent relative border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            {t('landing.faq.title', 'Common Questions')}
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
             <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
             >
                <Disclosure>
                  {({ open }) => (
                    <div className={`bg-[#000B1F] rounded-2xl border ${open ? 'border-white/20' : 'border-white/5'} transition-colors overflow-hidden`}>
                      <Disclosure.Button className="w-full px-6 py-5 flex items-center justify-between text-left">
                        <span className="text-white font-semibold">{t(faq.qKey, faq.qDefault)}</span>
                        <CaretGlyph className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </Disclosure.Button>
                      <Disclosure.Panel className="px-6 pb-6 text-slate-400 leading-relaxed">
                        {t(faq.aKey, faq.aDefault)}
                      </Disclosure.Panel>
                    </div>
                  )}
                </Disclosure>
             </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center text-slate-500 text-sm">
           Need more help? <a href="mailto:care@ugm.ac.id" className="text-white hover:underline">Contact Support</a>
        </div>

      </div>
    </section>
  );
}
