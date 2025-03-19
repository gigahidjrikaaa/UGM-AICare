"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaComments, FaHeartbeat, FaLock, FaArrowRight } from 'react-icons/fa';
import { HiChevronRight } from 'react-icons/hi';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import ParticleBackground from '@/components/ui/ParticleBackground';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const featureScale = useTransform(scrollYProgress, [0.1, 0.3], [0.95, 1]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scrolls so that the animation loads (quick fix)
  useEffect(() => {
    if (mounted) {
      // Scroll to a specific position on page load
      window.scrollTo({
        top: 10, // Change this value to scroll to different positions (in pixels)
        behavior: 'smooth' 
      });
      
      // Alternative: Scroll to a specific element
      // const targetSection = document.getElementById('section-id');
      // if (targetSection) {
      //   targetSection.scrollIntoView({ behavior: 'smooth' });
      // }
    }
  }, [mounted]);
  
  if (!mounted) return null;

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero Section with Particle Background */}
      <section className="relative h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#001D58] to-[#00308F]">
        {/* Particle Background */}
        <div className="absolute inset-0 z-0">
          <ParticleBackground count={100} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={1} maxSize={4} speed={0.5} />
        </div>
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#00225f]/50 to-[#001D58]/90 z-10"></div>
        
        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-4 z-20 w-full">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ opacity: heroOpacity }}
            className="flex flex-col lg:flex-row items-center gap-8"
          >
            {/* Left column: Heading and Description */}
            <div className="lg:w-1/2 text-center lg:text-left">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl lg:text-6xl font-bold text-white leading-tight"
              >
                Meet <span className="text-[#FFCA40] relative">
                  Aika
                  <span className="absolute -bottom-1 left-0 w-full h-1 bg-[#FFCA40]/30 rounded-full"></span>
                </span>, Your Mental Health Companion
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl text-gray-200 mt-8 max-w-lg mx-auto lg:mx-0"
              >
                A supportive AI assistant designed to help UGM students navigate emotional challenges and promote mental wellbeing.
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-10 flex flex-col sm:flex-row gap-5 justify-center lg:justify-start"
              >
                <GoogleSignInButton />
                <Link href="/aika">
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-white/20 text-white rounded-full font-medium text-lg flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg shadow-[#001D58]/30 w-full sm:w-auto"
                  >
                    Try Demo
                    <HiChevronRight className="ml-2 text-xl" />
                  </motion.button>
                </Link>
              </motion.div>
            </div>
            
            {/* Right column: Interactive Illustration */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end relative">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 100,
                  delay: 0.4,
                  duration: 1 
                }}
                className="relative w-[320px] h-[320px] lg:w-[460px] lg:h-[460px]"
              >
                {/* Background Blobs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-[#FFCA40]/20 blur-2xl"></div>
                <div className="absolute top-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-[#6A98F0]/20 blur-2xl"></div>
                
                {/* Aika Image with Glass Effect */}
                <motion.div 
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 2, 0, -2, 0]
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 8,
                    ease: "easeInOut"
                  }}
                  className="relative z-10 h-full w-full"
                >
                  <Image 
                    src="/aika-avatar.png" 
                    alt="Aika Character" 
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </motion.div>
                
                {/* Status Indicator */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                  className="absolute -bottom-6 -right-6 z-20"
                >
                  <div className="bg-white/15 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 bg-[#FFCA40] rounded-full animate-pulse"></div>
                      <span className="text-white font-medium">Aika is ready to chat</span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <span className="text-white/70 text-sm mb-2">Scroll to explore</span>
            <div className="h-14 w-7 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
          </motion.div>
        </motion.div>
      </section>
      
      {/* Features Section with Glass Morphism */}
      <section className="relative py-24 bg-gradient-to-b from-[#001D58] to-[#00308F]">
        <div className="absolute inset-0 bg-[url('/pattern-grid.png')] opacity-5 z-0"></div>
        
        <motion.div 
          style={{ scale: featureScale }}
          className="max-w-7xl mx-auto px-4 relative z-10"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-3xl lg:text-4xl font-bold text-white text-center mb-6"
          >
            How Aika Can Help You
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center text-white/80 max-w-2xl mx-auto mb-16"
          >
            Our AI-powered companion provides personalized support for your mental wellbeing journey,
            helping you navigate life&apos;s challenges with confidence.
          </motion.p>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* Feature Cards */}
            {[
              {
                icon: <FaComments />,
                color: "bg-gradient-to-br from-blue-400 to-blue-600",
                title: "24/7 Support",
                description: "Aika is always available to listen and provide emotional support whenever you need someone to talk to.",
                delay: 0
              },
              {
                icon: <FaHeartbeat />,
                color: "bg-gradient-to-br from-yellow-400 to-amber-500",
                title: "Wellbeing Resources",
                description: "Access personalized resources and techniques to help manage stress, anxiety, and improve overall mental wellbeing.",
                delay: 0.2
              },
              {
                icon: <FaLock />,
                color: "bg-gradient-to-br from-purple-400 to-purple-600",
                title: "Private & Secure",
                description: "Your conversations with Aika are private and secure. We prioritize your confidentiality and data protection.",
                delay: 0.4
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + feature.delay }}
                whileHover={{ translateY: -8 }}
                className="group"
              >
                <div className="h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
                  {/* Background Accent */}
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#FFCA40]/80 to-[#FFCA40]/0"></div>
                  
                  {/* Icon */}
                  <div className={`h-16 w-16 ${feature.color} rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-white/80 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Learn More Link */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <Link href="#" className="inline-flex items-center text-[#FFCA40] font-medium hover:underline group-hover:translate-x-2 transition-transform duration-300">
                      Learn more
                      <FaArrowRight className="ml-2 text-sm" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
      
      {/* Statistics Section */}
      <section className="py-20 bg-gradient-to-b from-[#00308F] to-[#001D58]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: "10,000+", label: "Students Helped" },
              { value: "24/7", label: "Availability" },
              { value: "92%", label: "Satisfaction Rate" },
              { value: "100%", label: "Confidential" }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <div className="text-3xl md:text-4xl font-bold text-[#FFCA40]">{stat.value}</div>
                <div className="text-white/70 mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-b from-[#001D58] to-[#001545]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">What Students Say</h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Hear from fellow students about their experiences with Aika and how it has supported their mental health journey.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "Aika has been there for me when I felt overwhelmed with exams. The breathing exercises and motivation really helped me stay focused.",
                name: "Andi S.",
                role: "Computer Science Student"
              },
              {
                quote: "As an international student, I often felt isolated. Talking with Aika helped me process my feelings and find community resources.",
                name: "Maria T.",
                role: "Economics Major"
              },
              {
                quote: "The 3am study nights were getting to me. Having Aika to chat with when everyone else was asleep made a huge difference to my mental health.",
                name: "Budi R.",
                role: "Medical Student"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg"
              >
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    <div className="text-4xl text-[#FFCA40] opacity-50 mb-4">&quot;</div>
                    <p className="text-white/90 italic leading-relaxed">
                      {testimonial.quote}
                    </p>
                  </div>
                  <div className="pt-6 mt-6 border-t border-white/10">
                    <p className="font-medium text-white">{testimonial.name}</p>
                    <p className="text-sm text-white/60">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Quote Section with Parallax */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-20 text-center px-4 py-10 relative"
          >
            <div className="absolute top-0 right-0 -mt-10 mr-10 text-8xl opacity-10 text-[#FFCA40]">&quot;</div>
            <div className="absolute bottom-0 left-0 -mb-10 ml-10 text-8xl opacity-10 text-[#FFCA40]">&quot;</div>
            
            <blockquote className="text-2xl md:text-3xl italic text-white font-light leading-relaxed max-w-3xl mx-auto">
              &quot;Mental health is not a destination, but a process. It&apos;s about how you drive, not where you&apos;re going.&quot;
            </blockquote>
            <div className="mt-6 inline-block">
              <p className="text-[#FFCA40] font-medium">— UGM Counseling Center</p>
              <div className="h-1 w-24 bg-[#FFCA40]/30 mx-auto mt-2 rounded-full"></div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-[#001545] to-[#00112e]">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto px-4 text-center"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Start Your Journey?</h2>
          <p className="text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of UGM students who have already discovered the benefits of having Aika as their mental wellness companion.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <GoogleSignInButton />
            </motion.div>
            <Link href="/aika">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.25)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-8 py-3 bg-white/10 text-white rounded-full font-medium text-lg flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg"
              >
                Try Demo First
                <HiChevronRight className="ml-2 text-xl" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}