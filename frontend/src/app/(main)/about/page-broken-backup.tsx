"use client";

import { motion } from 'framer-motion';
import { FiShield, FiHeart, FiUsers, FiZap, FiTrendingUp, FiClock } from 'react-icons/fi';
import { FaStar, FaGraduationCap } from 'react-icons/fa';
import Link from 'next/link';
import ParticleBackground from '@/components/ui/ParticleBackground';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] pt-24 pb-10 px-4 sm:px-6 relative">
      <div className="absolute inset-0 z-0 opacity-40">
        <ParticleBackground count={60} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={0.8} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFCA40]/20 backdrop-blur-xl rounded-full border border-[#FFCA40]/30 shadow-lg mb-6"
          >
            <FaStar className="text-[#FFCA40]" />
            <span className="text-white font-medium text-sm">About UGM-AICare</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Transforming University <span className="text-[#FFCA40]">Mental Health Support</span>
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            An AI-powered safety agent framework for proactive intervention, CBT-informed coaching, and privacy-preserving analytics—designed specifically for Indonesian university students.
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 md:p-12 mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#FFCA40]/20 rounded-full p-3">
              <FiHeart className="text-[#FFCA40] text-2xl" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Our Mission</h2>
          </div>
          
          <p className="text-white/90 text-lg leading-relaxed mb-6">
            University mental health services remain reactive, under-resourced, and data-constrained. UGM-AICare addresses these challenges by providing:
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <FiZap />,
                title: "Early Detection",
                description: "Proactive intervention rather than crisis-only response"
              },
              {
                icon: <FiUsers />,
                title: "Coordinated Automation",
                description: "Seamless integration across clinical care and coaching workflows"
              },
              {
                icon: <FiShield />,
                title: "Privacy-First",
                description: "Institution-grade privacy with verifiable guarantees"
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-[#FFCA40] text-3xl mb-3">{item.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Safety Agent Suite Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 md:p-12 mb-12"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-[#FFCA40]/20 rounded-full p-3">
              <FiShield className="text-[#FFCA40] text-2xl" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Safety Agent Suite</h2>
          </div>

          <p className="text-white/90 text-lg mb-8">
            Our LangGraph-orchestrated multi-agent system combines high-sensitivity crisis detection with evidence-based therapeutic support:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                emoji: "🛡️",
                name: "Safety Triage Agent (STA)",
                description: "Real-time message classification, risk scoring (Level 0-3), and escalation routing with PII redaction"
              },
              {
                emoji: "💬",
                name: "Support Coach Agent (SCA)",
                description: "CBT-informed personalized coaching with therapeutic exercise guidance and intervention plans"
              },
              {
                emoji: "🗂️",
                name: "Service Desk Agent (SDA)",
                description: "Clinical case management with SLA tracking, auto-assignment, and follow-up workflows"
              },
              {
                emoji: "🔍",
                name: "Insights Agent (IA)",
                description: "Privacy-preserving analytics with differential privacy guarantees and k-anonymity enforcement"
              }
            ].map((agent, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-[#FFCA40]/50 transition-all"
              >
                <div className="text-4xl mb-4">{agent.emoji}</div>
                <h3 className="text-xl font-bold text-white mb-3">{agent.name}</h3>
                <p className="text-white/70">{agent.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-[#FFCA40]/10 border border-[#FFCA40]/30 rounded-xl">
            <p className="text-white/90 text-center">
              <span className="font-bold text-[#FFCA40]">Orchestration Flow:</span> User Message → STA (Triage) → [Low/Moderate] → SCA (Coach) → END | [High/Critical] → SDA (Escalate) → END
            </p>
          </div>
        </motion.section>

        {/* Key Statistics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <FiUsers />, value: "5,000+", label: "Active Users" },
              { icon: <FiClock />, value: "24/7", label: "Available" },
              { icon: <FaStar />, value: "95%", label: "Satisfaction" },
              { icon: <FiTrendingUp />, value: "50K+", label: "Conversations" }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center"
              >
                <div className="text-[#FFCA40] text-3xl mb-3 flex justify-center">{stat.icon}</div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Explore More - Navigation Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Explore More</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                href: "/about/aika",
                icon: <FiHeart />,
                title: "Meet Aika",
                description: "Learn about your AI companion",
                color: "from-pink-500 to-red-500"
              },
              {
                href: "/about/features",
                icon: <FiZap />,
                title: "Features & Services",
                description: "Explore our comprehensive tools",
                color: "from-blue-500 to-cyan-500"
              },
              {
                href: "/about/privacy",
                icon: <FiShield />,
                title: "Privacy & Security",
                description: "How we protect your data",
                color: "from-green-500 to-emerald-500"
              },
              {
                href: "/about/research",
                icon: <FaGraduationCap />,
                title: "Research & Team",
                description: "Our methodology and team",
                color: "from-purple-500 to-indigo-500"
              }
            ].map((card, idx) => (
              <Link key={idx} href={card.href}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-[#FFCA40]/50 transition-all h-full cursor-pointer"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 text-white text-2xl`}>
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-white/70 text-sm">{card.description}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center bg-gradient-to-r from-[#FFCA40]/20 to-[#FFB700]/20 backdrop-blur-xl rounded-2xl p-12 border border-[#FFCA40]/30"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of UGM students who trust AICare for their mental health journey
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-[#FFCA40] to-[#FFB700] text-[#001D58] rounded-full font-bold text-lg shadow-2xl shadow-[#FFCA40]/50"
              >
                Start Free Today
              </motion.button>
            </Link>
            <Link href="/aika">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                Talk to Aika
              </motion.button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
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