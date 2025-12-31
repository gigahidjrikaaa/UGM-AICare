"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';

const partners = [
  {
    name: "Universitas Gadjah Mada",
    logo: "/UGM_Lambang.png",
    description: "Indonesia's top university"
  },
  {
    name: "DTETI UGM",
    logo: "/DTETI_Logo.png",
    description: "Department of Electrical Engineering & IT"
  }
];

const stats = [
  { value: "24/7", label: "Availability" },
  { value: "<2s", label: "Response Time" },
  { value: "100%", label: "Private & Secure" },
  { value: "Free", label: "For UGM Students" }
];

export default function TrustSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-[#001D58] to-[#000B1F] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-8">
            Trusted & Developed By
          </p>
          
          {/* Partner Logos */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {partners.map((partner, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center group"
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 mb-3 transition-transform duration-300 group-hover:scale-110">
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    fill
                    className="object-contain filter brightness-100 group-hover:brightness-110 transition-all"
                  />
                </div>
                <p className="text-white/80 text-sm font-medium">{partner.name}</p>
                <p className="text-gray-500 text-xs">{partner.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-12" />

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <motion.div
                className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#FFCA40] to-[#FFD770] bg-clip-text text-transparent mb-2"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {stat.value}
              </motion.div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Security Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-12"
        >
          <SecurityBadge icon="🔒" text="End-to-End Encrypted" />
          <SecurityBadge icon="🛡️" text="GDPR Compliant" />
          <SecurityBadge icon="✓" text="UGM Verified" />
          <SecurityBadge icon="🤝" text="Professional Support" />
        </motion.div>
      </div>
    </section>
  );
}

function SecurityBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 text-sm text-gray-300"
    >
      <span>{icon}</span>
      <span>{text}</span>
    </motion.div>
  );
}
