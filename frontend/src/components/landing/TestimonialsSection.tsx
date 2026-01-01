"use client";

import { motion } from 'framer-motion';
import { FaStar } from '@/icons';

const testimonials = [
  {
    name: "Rania A.",
    major: "Civil Engineering",
    year: "2022",
    avatar: "RA",
    rating: 5,
    text: "When I was overwhelmed with my thesis at 2 AM, Aika gave me grounding techniques that actually helped. The next day, I booked a counseling session at GMC through Aika's recommendation.",
    tag: "📚 Thesis Stress"
  },
  {
    name: "Fajar D.",
    major: "Medicine",
    year: "2021",
    avatar: "FD",
    rating: 5,
    text: "I was skeptical about AI for mental health at first. But when I tried it, Aika truly understood my situation. No judgment, just immediate action plans that were actually realistic.",
    tag: "😰 Anxiety"
  },
  {
    name: "Dinda K.",
    major: "Psychology",
    year: "2023",
    avatar: "DK",
    rating: 5,
    text: "First semester homesickness hit hard. Aika became my first outlet before I finally went to the campus psychologist. The response was literally 2 seconds.",
    tag: "🏠 Homesick"
  },
  {
    name: "Andi S.",
    major: "Computer Science",
    year: "2022",
    avatar: "AS",
    rating: 5,
    text: "The gamification features keep me coming back for daily check-ins. It doesn't feel like a chore anymore. Plus, the breathing exercises during coding sprints are a lifesaver!",
    tag: "🎮 Wellness Journey"
  },
  {
    name: "Maya P.",
    major: "Economics",
    year: "2023",
    avatar: "MP",
    rating: 5,
    text: "I love that everything is confidential. I can talk about anything without worrying. When I needed professional help, the referral to HPU was seamless.",
    tag: "🔒 Privacy Matters"
  },
  {
    name: "Rizki H.",
    major: "Architecture",
    year: "2021",
    avatar: "RH",
    rating: 5,
    text: "Deadline season used to destroy my mental health. Now I have Aika to help me through those tough nights. The CBT techniques actually work.",
    tag: "⏰ Deadline Stress"
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-linear-to-b from-[#000B1F] to-[#001D58] relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#FFCA40] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#6A98F0] rounded-full blur-3xl" />
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
            <span className="text-[#FFCA40] font-semibold text-sm">USE CASE SCENARIOS</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            How Aika Can{' '}
            <span className="bg-linear-to-r from-[#FFCA40] to-[#FFD770] bg-clip-text text-transparent">
              Help You
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See how Aika could help UGM students navigate their mental health journey.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl h-full flex flex-col hover:border-[#FFCA40]/30 transition-colors">
                {/* Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4 self-start">
                  <span className="text-[#FFCA40] text-sm font-semibold">{testimonial.tag}</span>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-[#FFCA40] text-sm" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-white/80 text-sm leading-relaxed mb-6 grow">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#FFCA40] to-[#FFB700] flex items-center justify-center text-[#001D58] font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-gray-400 text-xs">{testimonial.major} • {testimonial.year}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 mb-4">
            Ready to start your wellness journey? Aika is here to support you.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
