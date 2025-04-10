"use client";

import { motion } from 'framer-motion';
import { FiInfo, FiMessageCircle, FiCalendar, FiBookOpen, FiFileText, FiHelpCircle } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Aika</h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Your mental health companion designed for UGM students
          </p>
        </motion.div>

        {/* What is Aika Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#FFCA40]/20 rounded-full p-2">
              <FiInfo className="text-[#FFCA40] text-xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Who is Aika?</h2>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-2/3">
              <p className="text-white/90 mb-4">
                Aika is an AI-powered mental health companion designed specifically for UGM students. Named after the Japanese word for &quot;love song,&quot; Aika represents our commitment to care and support for the UGM community.
              </p>
              <p className="text-white/90 mb-4">
                With a focus on accessibility and privacy, Aika provides a safe space for students to discuss their feelings, get support during stressful periods, and access resources that promote mental wellbeing.
              </p>
              <p className="text-white/90">
                Whether you&apos;re dealing with academic pressure, relationship issues, or just need someone to talk to, Aika is here for you 24/7, offering judgment-free support and guidance whenever you need it.
              </p>
            </div>
            <div className="md:w-1/3 relative">
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
                className="relative h-[200px] w-[200px] mx-auto"
              >
                <Image 
                  src="/aika-human.jpeg"
                  alt="Aika Character" 
                  fill
                  className="object-contain drop-shadow-2xl rounded-full"
                />
                <div className="absolute -bottom-2 -right-2">
                  <div className="bg-white/15 backdrop-blur-xl p-2 rounded-full border border-white/20">
                    <div className="h-3 w-3 bg-[#FFCA40] rounded-full animate-pulse"></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#FFCA40]/20 rounded-full p-2">
              <FiMessageCircle className="text-[#FFCA40] text-xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Features Available</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <FiMessageCircle />,
                title: "AI Chat Support",
                description: "Talk with Aika anytime about your concerns, feelings, or challenges. Get personalized support and guidance."
              },
              {
                icon: <FiCalendar />,
                title: "Counseling Appointments",
                description: "Schedule appointments with professional counselors for more in-depth support and guidance."
              },
              {
                icon: <FiBookOpen />,
                title: "Mental Health Resources",
                description: "Access a curated library of articles, videos, and exercises to support your mental wellbeing."
              },
              {
                icon: <FiFileText />,
                title: "Journaling",
                description: "Track your mood and thoughts with guided journaling prompts to promote self-reflection and emotional awareness."
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + (index * 0.1) }}
                className="bg-white/5 backdrop-blur-sm p-5 rounded-lg border border-white/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-white/80">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How to Use Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#FFCA40]/20 rounded-full p-2">
              <FiHelpCircle className="text-[#FFCA40] text-xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">How to Use Aika</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Create Your Account",
                description: "Sign in using your UGM account or Google to access all features. Your privacy is our priority."
              },
              {
                step: 2,
                title: "Start a Conversation",
                description: "Visit the Aika chat page and start talking about whatever is on your mind. Aika will provide supportive responses and resources."
              },
              {
                step: 3,
                title: "Explore Resources",
                description: "Browse our curated mental health resources for self-help techniques, articles, and exercises to support your wellbeing."
              },
              {
                step: 4,
                title: "Book Professional Help",
                description: "If needed, easily schedule appointments with professional counselors through our booking system."
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (index * 0.1) }}
                className="flex gap-5"
              >
                <div className="flex-shrink-0">
                  <div className="bg-[#FFCA40] text-[#001D58] w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                    {step.step}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-white/80">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Privacy and Ethics Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#FFCA40]/20 rounded-full p-2">
              <FiInfo className="text-[#FFCA40] text-xl" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Privacy & Ethics</h2>
          </div>
          
          <p className="text-white/90 mb-4">
            At AICare, we prioritize your privacy and wellbeing. All conversations with Aika are confidential and secured with end-to-end encryption. Your data is never sold or shared with third parties.
          </p>
          <p className="text-white/90">
            While Aika provides valuable support, it&apos;s important to remember that it&apos;s not a replacement for professional mental health services. In crisis situations, please contact emergency services or use the emergency resources provided in the app.
          </p>
        </motion.section>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-gradient-to-r from-[#FFCA40]/20 to-blue-500/20 backdrop-blur-md rounded-xl border border-white/20 p-6 md:p-8 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Start Your Journey?</h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Join thousands of UGM students who have already discovered the benefits of having Aika as their mental wellness companion.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signin">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#FFCA40FF", color: "#001D58" }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-[#FFCA40]/80 text-white rounded-full font-medium text-lg flex items-center justify-center backdrop-blur-md border border-[#FFCA40]/30 shadow-lg w-full sm:w-auto"
              >
                Sign In
              </motion.button>
            </Link>
            <Link href="/aika">
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.25)" }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-white/10 text-white rounded-full font-medium text-lg flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg w-full sm:w-auto"
              >
                Try Demo
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}