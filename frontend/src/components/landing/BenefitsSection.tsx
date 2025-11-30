"use client";

import { motion } from 'framer-motion';
import { FiCheckCircle, FiZap, FiHeart, FiUsers } from '@/icons';

const benefits = [
  {
    icon: FiZap,
    title: "Automatic Crisis Detection",
    description: "Our AI instantly detects if you're in an emergency situation and provides immediate emergency resources within seconds.",
    stat: "<1s",
    statLabel: "Response Time",
    color: "from-[#FF6B9D] to-[#FF8FAB]",
    features: [
      "Real-time crisis detection",
      "UGM emergency hotline",
      "Auto-connect to counselors",
      "24/7 monitoring"
    ]
  },
  {
    icon: FiHeart,
    title: "Personalized Action Plans",
    description: "Everyone is different. Aika creates intervention plans tailored specifically to your situation and needs.",
    stat: "100%",
    statLabel: "Personalized",
    color: "from-[#FFCA40] to-[#FFD770]",
    features: [
      "CBT-based techniques",
      "Step-by-step guidance",
      "Progress tracking",
      "Adaptive recommendations"
    ]
  },
  {
    icon: FiUsers,
    title: "Connect to UGM Counselors",
    description: "Need professional help? Aika directly connects you to counselors at GMC, HPU, or UGM Psychology Faculty.",
    stat: "24/7",
    statLabel: "Available",
    color: "from-[#6A98F0] to-[#8AABF5]",
    features: [
      "Direct booking to GMC",
      "Integrated with HPU",
      "Psychologist referrals",
      "Automatic follow-ups"
    ]
  }
];

export default function BenefitsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#001D58] via-[#002A7A] to-[#000B1F] relative overflow-hidden">
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
          <div className="inline-block px-4 py-2 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4">
            <span className="text-[#FFCA40] font-semibold text-sm">WHY CHOOSE AIKA?</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Not Just Another Chatbot,<br />
            <span className="text-[#FFCA40]">A Complete System</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Aika offers three core advantages you won&apos;t find in other mental health chatbots.
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
                  className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Icon */}
                <div className="relative">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-6 shadow-lg`}
                  >
                    <benefit.icon className="text-white text-2xl" />
                  </motion.div>
                </div>

                {/* Stat Badge */}
                <div className="absolute top-8 right-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent`}>
                      {benefit.stat}
                    </div>
                    <div className="text-xs text-gray-400 text-center">{benefit.statLabel}</div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 relative">
                  {benefit.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed mb-6 relative">
                  {benefit.description}
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
                      <FiCheckCircle className={`text-[#4ADE80] flex-shrink-0`} />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Visual Comparison Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-[#FFCA40]/10 via-[#FFD770]/10 to-[#FFCA40]/10 backdrop-blur-xl rounded-3xl p-12 border border-[#FFCA40]/30"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Placeholder Graphic */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#001D58] to-[#002A7A] flex items-center justify-center relative overflow-hidden border-2 border-[#FFCA40]/30">
                {/* Placeholder for Infographic */}
                <div className="text-center p-8">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="mb-4"
                  >
                    <div className="w-24 h-24 mx-auto rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                      <svg className="w-12 h-12 text-[#FFCA40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </motion.div>
                  <h4 className="text-xl font-bold text-white mb-2">System Architecture</h4>
                  <p className="text-gray-400 text-sm">Infographic coming soon</p>
                </div>
              </div>
            </div>

            {/* Right: Text Content */}
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                What Makes Aika<br />
                <span className="text-[#FFCA40]">Different</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#4ADE80]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Integrated with UGM Systems</h4>
                    <p className="text-gray-400 text-sm">Directly connected to GMC, HPU, and campus mental health services.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#4ADE80]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Evidence-Based CBT</h4>
                    <p className="text-gray-400 text-sm">All techniques provided by Aika are based on Cognitive Behavioral Therapy research.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#4ADE80]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Multi-Agent AI System</h4>
                    <p className="text-gray-400 text-sm">Not just one AI, but 4 specialized agents working together to help you.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#4ADE80]/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-[#4ADE80]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Privacy-First Design</h4>
                    <p className="text-gray-400 text-sm">Your data is secure with differential privacy and end-to-end encryption.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
