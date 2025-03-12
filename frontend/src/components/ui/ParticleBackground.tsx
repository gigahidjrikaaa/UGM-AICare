"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  duration: number;
  delay: number;
}

interface ParticleBackgroundProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  speed?: number;
}

export default function ParticleBackground({
  count = 50,
  colors = ["#FFCA40", "#6A98F0", "#ffffff"],
  minSize = 2,
  maxSize = 8,
  speed = 1,
}: ParticleBackgroundProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    // Update dimensions on mount and window resize
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    // Generate particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // position as percentage of screen
        y: Math.random() * 100,
        size: Math.random() * (maxSize - minSize) + minSize,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.7 + 0.1, // between 0.1 and 0.8
        duration: (Math.random() * 20 + 10) / speed, // between 10-30s, adjusted by speed
        delay: Math.random() * -20, // some particles will be mid-animation on load
      });
    }
    setParticles(newParticles);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [count, colors, minSize, maxSize, speed]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-5]">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            filter: `blur(${particle.size / 2}px)`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.size / 2}px ${particle.color}`,
          }}
          animate={{
            x: [
              Math.random() * 100 - 50, 
              Math.random() * 100 - 50, 
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
            ],
            y: [
              Math.random() * 100 - 50, 
              Math.random() * 100 - 50, 
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
              Math.random() * 100 - 50,
            ],
            opacity: [
              particle.opacity,
              particle.opacity * 1.5,
              particle.opacity,
              particle.opacity * 0.7,
              particle.opacity,
            ],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}