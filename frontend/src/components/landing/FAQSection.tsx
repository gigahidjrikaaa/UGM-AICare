"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiChevronDown } from '@/icons';

const faqs = [
  {
    question: "Aika nggak bakal gantiin konselor profesional kan?",
    answer: "Engga kok! Aika itu complementary, bukan replacement. Fungsi Aika adalah kasih first-line support, teknik coping CBT-based, dan kalau situasinya butuh bantuan profesional, Aika bakal langsung referral kamu ke konselor di GMC atau psikolog kampus. Think of Aika as your 24/7 companion yang bisa bridge kamu ke professional help."
  },
  {
    question: "Kalau aku lagi krisis, gimana? Aika bisa handle?",
    answer: "Yes, Aika punya crisis detection system. Kalau Aika detect kamu lagi dalam kondisi darurat (misal ada suicidal thoughts atau self-harm tendencies), Aika bakal:\n\n1. Langsung kasih emergency resources (UGM Crisis Line, SEJIWA 119, Emergency 112)\n2. Auto-escalate ke sistem UGM untuk immediate intervention\n3. Kasih grounding techniques untuk stabilize kondisi kamu\n4. Connect kamu ke on-call counselor (kalau available)\n\nTapi ingat: untuk situasi life-threatening, selalu hubungi emergency services (112) atau datang langsung ke UGM Health Center."
  },
  {
    question: "Chat aku sama Aika aman nggak? Privasi gimana?",
    answer: "100% aman dan confidential. Semua chat:\n\n• Encrypted end-to-end\n• Ga disimpan di server external\n• Cuma bisa diakses sama kamu (dan konselor kalau kamu opt-in untuk sharing)\n• Pakai differential privacy untuk analytics (jadi data kamu ga bisa di-trace back)\n• Comply dengan standar GDPR dan UU Perlindungan Data Pribadi Indonesia\n\nKamu juga bisa request full deletion of your data kapanpun mau."
  },
  {
    question: "Beneran gratis? Ada hidden cost-nya nggak?",
    answer: "Gratis selamanya untuk mahasiswa UGM. Ga ada hidden cost, ga ada subscription, ga ada paywall. Ini funded by UGM as part of student wellness initiative. Yang kamu butuhkan cuma email UGM aktif untuk verifikasi (tapi ga perlu login setiap kali chat)."
  }
];

export default function FAQSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-gradient-to-b from-[#001D58] to-[#000B1F] relative overflow-hidden">
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
          <div className="inline-block px-4 py-2 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4">
            <span className="text-[#FFCA40] font-semibold text-sm">FAQ</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Masih Ada Pertanyaan?<br />
            <span className="text-[#FFCA40]">Kami Jawab</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Questions yang paling sering ditanyain sama mahasiswa UGM.
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
              <button
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-lg hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-[#FFCA40] transition-colors flex-1">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: activeIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <FiChevronDown className="text-[#FFCA40] text-2xl" />
                  </motion.div>
                </div>
                
                <motion.div
                  initial={false}
                  animate={{ 
                    height: activeIndex === index ? "auto" : 0,
                    opacity: activeIndex === index ? 1 : 0,
                    marginTop: activeIndex === index ? 16 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                    {faq.answer}
                  </p>
                </motion.div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Additional Resources */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 bg-gradient-to-r from-[#FFCA40]/10 via-[#FFD770]/10 to-[#FFCA40]/10 backdrop-blur-xl rounded-3xl p-8 border border-[#FFCA40]/30"
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Masih ada pertanyaan lain?
            </h3>
            <p className="text-gray-400 mb-6">
              Langsung aja chat Aika atau hubungi tim support kami.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@ugm-aicare.id" 
                className="px-8 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                📧 support@ugm-aicare.id
              </a>
              <a 
                href="tel:+62274555555" 
                className="px-8 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-all border border-white/20"
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
