'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaLinkedinIn } from '@/icons';
import { Heart, Shield, MessageCircle, Github } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-white/5 backdrop-blur-xl border-t border-white/10 text-white mt-auto">
      {/* Decorative top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFCA40] to-transparent opacity-50" />
      
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-flex items-center group mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#FFCA40] rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                <Image 
                  src="/UGM_Lambang.png" 
                  alt="UGM Logo" 
                  width={40} 
                  height={40}
                  className="relative transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold text-white group-hover:text-[#FFCA40] transition-colors duration-300">
                  UGM-AICare
                </h2>
                <p className="text-xs text-[#FFCA40]/80">Mental Health Support</p>
              </div>
            </Link>
            
            <p className="text-sm text-gray-300/90 leading-relaxed max-w-md mb-6">
              AI-powered mental health companion developed by Universitas Gadjah Mada to support student wellbeing.
            </p>

            {/* Key Features */}
            <div className="flex flex-wrap gap-3 mb-6">
              <FeatureBadge icon={<MessageCircle size={14} />} text="24/7 Support" />
              <FeatureBadge icon={<Shield size={14} />} text="Private & Secure" />
              <FeatureBadge icon={<Heart size={14} />} text="Empathetic AI" />
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Connect:</span>
              <SocialLink 
                href="https://linkedin.com/in/gigahidjrikaaa" 
                icon={<FaLinkedinIn size={16} />} 
                label="LinkedIn" 
              />
              <SocialLink 
                href="https://github.com/gigahidjrikaaa/UGM-AICare" 
                icon={<Github size={16} />} 
                label="GitHub" 
              />
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-sm font-semibold text-[#FFCA40] uppercase tracking-wider mb-4">
              Navigate
            </h3>
            <nav className="space-y-2.5">
              <FooterLink href="/dashboard">Dashboard</FooterLink>
              <FooterLink href="/aika">Talk to Aika</FooterLink>
              <FooterLink href="/resources">Resources</FooterLink>
              <FooterLink href="/journaling">Journaling</FooterLink>
            </nav>
          </motion.div>

          {/* Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-[#FFCA40] uppercase tracking-wider mb-4">
              Support
            </h3>
            <nav className="space-y-2.5">
              <FooterLink href="/crisis-support">Crisis Support</FooterLink>
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/faq">FAQs</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </nav>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div 
          className="mt-12 pt-8 border-t border-white/10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* UGM Logo & Copyright */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Image 
                src="/UGM_Tipografi.png" 
                alt="UGM" 
                width={70} 
                height={18} 
                className="opacity-70 bg-white/90 px-2 py-1 rounded"
              />
              <p className="text-xs text-gray-400">
                © {currentYear} Universitas Gadjah Mada. All rights reserved.
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6 text-xs">
              <LegalLink href="/privacy-policy">Privacy</LegalLink>
              <LegalLink href="/terms-of-service">Terms</LegalLink>
              <LegalLink href="/accessibility">Accessibility</LegalLink>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-center text-xs text-gray-400/70 italic">
            Aika is an AI assistant and not a substitute for professional medical advice.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}

// Helper Components

// Feature Badge
interface FeatureBadgeProps {
  icon: React.ReactNode;
  text: string;
}

function FeatureBadge({ icon, text }: FeatureBadgeProps) {
  return (
    <motion.div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 backdrop-blur-sm"
      whileHover={{ scale: 1.05, borderColor: 'rgba(255, 202, 64, 0.3)' }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-[#FFCA40]">{icon}</span>
      <span>{text}</span>
    </motion.div>
  );
}

// Social Link
interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function SocialLink({ href, icon, label }: SocialLinkProps) {
  return (
    <motion.a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:border-[#FFCA40]/50 flex items-center justify-center text-gray-300 hover:text-[#FFCA40] transition-colors duration-300 backdrop-blur-sm"
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
    </motion.a>
  );
}

// Footer Link
interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
}

function FooterLink({ href, children }: FooterLinkProps) {
  return (
    <Link 
      href={href} 
      className="text-sm text-gray-300 hover:text-[#FFCA40] transition-colors duration-300 inline-flex items-center group"
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#FFCA40] group-hover:w-full transition-all duration-300" />
      </span>
      <svg 
        className="w-3 h-3 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Legal Link
interface LegalLinkProps {
  href: string;
  children: React.ReactNode;
}

function LegalLink({ href, children }: LegalLinkProps) {
  return (
    <Link 
      href={href} 
      className="text-gray-400 hover:text-[#FFCA40] transition-colors duration-300 relative group"
    >
      {children}
      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#FFCA40] group-hover:w-full transition-all duration-300" />
    </Link>
  );
}