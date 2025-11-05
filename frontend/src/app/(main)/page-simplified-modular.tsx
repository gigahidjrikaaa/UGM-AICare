"use client";

import { useState, useEffect } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FAQSection from '@/components/landing/FAQSection';
import FinalCTASection from '@/components/landing/FinalCTASection';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Quick scroll to trigger animations
  useEffect(() => {
    if (mounted) {
      window.scrollTo({
        top: 10,
        behavior: 'smooth' 
      });
    }
  }, [mounted]);
  
  if (!mounted) return null;

  return (
    <main className="min-h-screen overflow-x-hidden w-full">
      {/* Hero Section - Lagi Stress? Chat Aja ke Aika */}
      <HeroSection />
      
      {/* Testimonials Section - Student Stories */}
      <TestimonialsSection />
      
      {/* Benefits Section - 3 Core Benefits */}
      <BenefitsSection />
      
      {/* How It Works Section - 3 Steps */}
      <HowItWorksSection />
      
      {/* FAQ Section - Common Questions */}
      <FAQSection />
      
      {/* Final CTA Section - Call to Action */}
      <FinalCTASection />
    </main>
  );
}
