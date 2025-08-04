// src/components/ui/OptimizedAnimations.tsx
// Lightweight animation components to replace heavy Framer Motion usage

"use client";

import React from 'react';
import { cn } from '@/lib/utils';

// Lightweight particle background for non-critical pages
interface LightParticleBackgroundProps {
  count?: number;
  colors?: string[];
  className?: string;
}

export const LightParticleBackground: React.FC<LightParticleBackgroundProps> = ({
  count = 20,
  colors = ["#FFCA40", "#6A98F0", "#ffffff"],
  className = ""
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none z-[-5]", className)}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full opacity-60 animate-pulse"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.size / 2}px ${particle.color}`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Simple fade-in animation without Framer Motion
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  className = ""
}) => {
  return (
    <div 
      className={cn("animate-fade-in", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Simple slide-up animation
interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const SlideUp: React.FC<SlideUpProps> = ({
  children,
  delay = 0,
  className = ""
}) => {
  return (
    <div 
      className={cn("animate-slide-up", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// CSS-only loading spinner
export const SimpleSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; color?: string }> = ({
  size = 'md',
  color = '#FFCA40'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div 
      className={cn("animate-spin rounded-full border-2 border-gray-300", sizeClasses[size])}
      style={{ borderTopColor: color }}
    />
  );
};

// Simple hover scale effect without Framer Motion
interface HoverScaleProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}

export const HoverScale: React.FC<HoverScaleProps> = ({
  children,
  scale = 1.05,
  className = ""
}) => {
  return (
    <div 
      className={cn("transition-transform duration-200 ease-out hover:scale-105", className)}
      style={{ '--hover-scale': scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

// Simple floating animation using CSS
export const FloatingElement: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ""
}) => {
  return (
    <div className={cn("animate-float", className)}>
      {children}
    </div>
  );
};
