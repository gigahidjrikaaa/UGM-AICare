"use client";

import { motion } from 'framer-motion';
import { FaStar } from '@/icons';

const testimonials = [
  {
    name: "Rania A.",
    major: "Teknik Sipil",
    year: "2022",
    avatar: "RA",
    rating: 5,
    text: "Pas lagi overwhelmed skripsian jam 2 pagi, Aika kasih teknik grounding yang beneran ngebantu. Besoknya langsung booking konseling di GMC lewat rekomendasi Aika.",
    tag: "📚 Stress Skripsi"
  },
  {
    name: "Fajar D.",
    major: "Kedokteran",
    year: "2021",
    avatar: "FD",
    rating: 5,
    text: "Awalnya skeptis sama AI untuk mental health. Tapi pas nyoba, Aika bener-bener paham situasi aku. Ga judgmental, langsung kasih action plan yang realistis.",
    tag: "😰 Anxiety"
  },
  {
    name: "Dinda K.",
    major: "Psikologi",
    year: "2023",
    avatar: "DK",
    rating: 5,
    text: "Semester 1 homesick parah. Aika jadi tempat curhat pertama sebelum aku akhirnya ke psikolog kampus. Responnya cepet banget, literally 2 detik.",
    tag: "🏠 Homesick"
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-[#000B1F] to-[#001D58] relative overflow-hidden">
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
            <span className="text-[#FFCA40] font-semibold text-sm">TESTIMONI MAHASISWA UGM</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            Mereka Udah Coba,<br />
            <span className="text-[#FFCA40]">Sekarang Giliran Kamu</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Ribuan mahasiswa UGM udah dapetin bantuan dari Aika. Simak cerita mereka.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="relative"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl h-full flex flex-col">
                {/* Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFCA40]/10 rounded-full border border-[#FFCA40]/30 mb-4 self-start">
                  <span className="text-[#FFCA40] text-sm font-semibold">{testimonial.tag}</span>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <FaStar key={i} className="text-[#FFCA40] text-lg" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-white/80 text-base leading-relaxed mb-6 flex-grow">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  {/* Avatar Placeholder */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFCA40] to-[#FFB700] flex items-center justify-center text-[#001D58] font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-gray-400 text-sm">{testimonial.major} • {testimonial.year}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 bg-gradient-to-r from-[#FFCA40]/10 via-[#FFD770]/10 to-[#FFCA40]/10 backdrop-blur-xl rounded-3xl p-8 border border-[#FFCA40]/30"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#FFCA40] mb-2">73%</div>
              <div className="text-sm text-gray-400">Mahasiswa Indonesia alami stress akademik</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#FFCA40] mb-2">51%</div>
              <div className="text-sm text-gray-400">Mengalami gejala anxiety</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#FFCA40] mb-2">25%</div>
              <div className="text-sm text-gray-400">Memiliki gejala depresi</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#FFCA40] mb-2">2000+</div>
              <div className="text-sm text-gray-400">Mahasiswa UGM terbantu</div>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            Sumber: Indonesian National Mental Health Survey 2024
          </p>
        </motion.div>
      </div>
    </section>
  );
}
