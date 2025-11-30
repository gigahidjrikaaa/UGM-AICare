"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';

export default function StatsBannerSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-[#001D58] via-[#002A7A] to-[#001D58] relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1920&auto=format&fit=crop"
          alt="University students"
          fill
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001D58] via-[#001D58]/80 to-[#001D58]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Mental Health Matters for Students
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Indonesian university students face significant mental health challenges. 
            UGM-AICare is here to bridge the gap between awareness and action.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { value: "73%", label: "of Indonesian students experience academic stress", source: "INMHS 2024" },
            { value: "51%", label: "report symptoms of anxiety", source: "INMHS 2024" },
            { value: "25%", label: "show signs of depression", source: "INMHS 2024" },
            { value: "1 in 4", label: "delay seeking help due to stigma", source: "WHO 2023" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <motion.div
                className="text-5xl md:text-6xl font-black text-[#FFCA40] mb-3"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {stat.value}
              </motion.div>
              <p className="text-white/80 text-sm mb-2">{stat.label}</p>
              <p className="text-gray-500 text-xs">Source: {stat.source}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-[#FFCA40] font-semibold text-lg">
            You are not alone. Help is available 24/7.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
