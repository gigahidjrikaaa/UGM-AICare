"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiClock, FiShield, FiHeart } from '@/icons';

const aikaFeatures = [
  {
    icon: FiMessageCircle,
    title: "Empathetic Conversations",
    description: "Aika uses advanced NLP to understand context, emotions, and provide thoughtful responses."
  },
  {
    icon: FiClock,
    title: "Available 24/7",
    description: "No appointments needed. Aika is always here when you need someone to talk to."
  },
  {
    icon: FiShield,
    title: "Complete Privacy",
    description: "Your conversations are encrypted and confidential. Your data belongs to you."
  },
  {
    icon: FiHeart,
    title: "Evidence-Based Support",
    description: "Built on CBT principles and validated by mental health professionals."
  }
];

export default function MeetAikaSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#000B1F] to-[#001D58] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#FFCA40] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-[#6A98F0] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Aika Avatar & Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Main Avatar Container */}
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Glow Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#FFCA40]/30 to-[#6A98F0]/30 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Avatar Image */}
              <div className="relative z-10 rounded-3xl overflow-hidden border-4 border-[#FFCA40]/30 shadow-2xl">
                <Image
                  src="/aika-human.jpeg"
                  alt="Aika AI Companion"
                  width={500}
                  height={500}
                  className="object-cover w-full h-full"
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#001D58]/80 via-transparent to-transparent" />
                
                {/* Status Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-6 left-6 right-6"
                >
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-3 h-3 bg-[#4ADE80] rounded-full"
                      />
                      <div>
                        <p className="text-white font-semibold">Aika is Online</p>
                        <p className="text-gray-400 text-sm">Ready to chat with you</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Floating Chat Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, type: "spring" }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl rounded-br-sm p-4 shadow-2xl max-w-xs"
              >
                <p className="text-gray-800 text-sm">
                  &quot;Hi there! I&apos;m Aika. I&apos;m here to listen and support you whenever you need someone to talk to. 💙&quot;
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-block px-4 py-2 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-6">
              <span className="text-[#FFCA40] font-semibold text-sm">MEET YOUR AI COMPANION</span>
            </div>

            {/* Title */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Say Hello to{' '}
              <span className="bg-gradient-to-r from-[#FFCA40] via-[#FFD770] to-[#FFCA40] bg-clip-text text-transparent">
                Aika
              </span>
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Aika is your AI mental health companion, designed to provide empathetic, 
              non-judgmental support whenever you need it. Built with advanced AI 
              technology and validated by mental health professionals at UGM.
            </p>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {aikaFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-[#FFCA40]/30 transition-colors"
                >
                  <feature.icon className="text-[#FFCA40] text-xl mb-2" />
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <Link href="/aika">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg shadow-lg hover:shadow-[#FFCA40]/30 transition-shadow"
              >
                Start Chatting with Aika
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
