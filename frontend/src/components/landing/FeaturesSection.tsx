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

const features = [
  {
    icon: FiMessageCircle,
    title: "AI-Powered Conversations",
    description: "Natural, empathetic dialogue powered by advanced language models trained on mental health best practices.",
    color: "from-[#FFCA40] to-[#FFB700]"
  },
  {
    icon: FiShield,
    title: "Crisis Detection",
    description: "Automatic identification of urgent situations with immediate escalation to professional resources.",
    color: "from-[#FF6B9D] to-[#FF8FAB]"
  },
  {
    icon: FiUsers,
    title: "Counselor Connection",
    description: "Seamless referral to UGM's mental health services including GMC, HPU, and Psychology Faculty.",
    color: "from-[#6A98F0] to-[#8AABF5]"
  },
  {
    icon: FiActivity,
    title: "Progress Tracking",
    description: "Monitor your wellness journey with mood tracking, journaling insights, and personalized analytics.",
    color: "from-[#4ADE80] to-[#6EE7A0]"
  },
  {
    icon: FiBookOpen,
    title: "Resource Library",
    description: "Access curated mental health resources, self-help guides, and coping strategies anytime.",
    color: "from-[#A78BFA] to-[#C4B5FD]"
  },
  {
    icon: FiAward,
    title: "Gamified Wellness",
    description: "Earn rewards and badges for completing wellness activities and maintaining healthy habits.",
    color: "from-[#F97316] to-[#FB923C]"
  },
  {
    icon: FiTarget,
    title: "Personalized Goals",
    description: "Set and track personal wellness goals with AI-assisted recommendations tailored to you.",
    color: "from-[#14B8A6] to-[#2DD4BF]"
  },
  {
    icon: FiHeart,
    title: "Community Support",
    description: "Connect with peer support groups and wellness communities within the UGM ecosystem.",
    color: "from-[#EC4899] to-[#F472B6]"
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#000B1F] via-[#001D58] to-[#000B1F] relative overflow-hidden">
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
          <div className="inline-block px-4 py-2 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4">
            <span className="text-[#FFCA40] font-semibold text-sm">COMPREHENSIVE FEATURES</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Everything You Need for{' '}
            <span className="bg-gradient-to-r from-[#FFCA40] to-[#FFD770] bg-clip-text text-transparent">
              Mental Wellness
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            UGM-AICare provides a complete suite of tools designed to support your mental health journey, 
            from daily check-ins to professional counseling connections.
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
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />
                
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="text-white text-xl" />
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-bold text-white mb-2 relative z-10">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed relative z-10">
                  {feature.description}
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
            And many more features designed with your wellbeing in mind.
          </p>
          <motion.a
            href="/about"
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 text-[#FFCA40] font-semibold hover:text-[#FFD770] transition-colors"
          >
            Learn more about our approach
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
