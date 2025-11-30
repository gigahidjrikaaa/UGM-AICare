"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiChevronDown } from '@/icons';

const faqs = [
  {
    question: "Will Aika replace professional counselors?",
    answer: "Absolutely not! Aika is complementary, not a replacement. Aika's role is to provide first-line support, CBT-based coping techniques, and if the situation requires professional help, Aika will immediately refer you to counselors at GMC or campus psychologists. Think of Aika as your 24/7 companion that bridges you to professional help."
  },
  {
    question: "What if I'm in crisis? Can Aika handle it?",
    answer: "Yes, Aika has a crisis detection system. If Aika detects you're in an emergency (e.g., suicidal thoughts or self-harm tendencies), Aika will:\n\n1. Immediately provide emergency resources (UGM Crisis Line, SEJIWA 119, Emergency 112)\n2. Auto-escalate to the UGM system for immediate intervention\n3. Provide grounding techniques to stabilize your condition\n4. Connect you to an on-call counselor (if available)\n\nRemember: for life-threatening situations, always contact emergency services (112) or go directly to UGM Health Center."
  },
  {
    question: "Is my chat with Aika secure? What about privacy?",
    answer: "100% secure and confidential. All chats:\n\n• End-to-end encrypted\n• Not stored on external servers\n• Only accessible by you (and counselors if you opt-in for sharing)\n• Use differential privacy for analytics (your data cannot be traced back)\n• Comply with GDPR standards and Indonesian Personal Data Protection Law\n\nYou can also request full deletion of your data anytime."
  },
  {
    question: "Is it really free? Any hidden costs?",
    answer: "Free forever for UGM students. No hidden costs, no subscriptions, no paywalls. This is funded by UGM as part of the student wellness initiative. All you need is an active UGM email for verification (but you don't need to login every time you chat)."
  },
  {
    question: "What makes Aika different from other mental health chatbots?",
    answer: "Several key differences:\n\n• Integrated directly with UGM's mental health infrastructure (GMC, HPU, Psychology Faculty)\n• Multi-agent AI system with specialized agents for different needs\n• Evidence-based CBT techniques validated by professionals\n• Gamification for sustained engagement\n• Privacy-first architecture with differential privacy\n• Designed specifically for Indonesian university students"
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
            Got Questions?<br />
            <span className="text-[#FFCA40]">We Have Answers</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Common questions asked by UGM students about Aika.
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
              Still have more questions?
            </h3>
            <p className="text-gray-400 mb-6">
              Chat directly with Aika or contact our support team.
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
