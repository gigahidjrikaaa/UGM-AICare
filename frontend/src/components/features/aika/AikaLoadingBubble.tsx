/**
 * Aika Loading Message Bubble
 * 
 * Displays a loading state with agent activity indicators
 * showing which agents are currently processing the request.
 * Designed to look seamless with standard message bubbles.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface AikaLoadingBubbleProps {
  activeAgents?: string[];
  className?: string;
}

// Agent color mapping with distinct colors
const AGENT_COLORS = {
  STA: { name: 'Safety Triage', color: '#ef4444', action: 'Menilai risiko...' },
  TCA: { name: 'Therapeutic Coach', color: '#3b82f6', action: 'Menyiapkan dukungan...' },
  CMA: { name: 'Case Management', color: '#f59e0b', action: 'Memeriksa riwayat...' },
  IA: { name: 'Insights', color: '#8b5cf6', action: 'Menganalisis pola...' },
  AIKA: { name: 'Aika Orchestrator', color: '#10b981', action: 'Mengkoordinasikan agen...' },
};

const DEFAULT_ACTIVITIES = [
  "Sedang berpikir...",
  "Menganalisis pesanmu...",
  "Mencari informasi relevan...",
  "Menyusun jawaban terbaik...",
];

export function AikaLoadingBubble({ activeAgents = [], className = '' }: AikaLoadingBubbleProps) {
  const [currentActivity, setCurrentActivity] = useState(DEFAULT_ACTIVITIES[0]);
  const [activityIndex, setActivityIndex] = useState(0);

  // Cycle through activities
  useEffect(() => {
    // If we have active agents, show their specific actions
    if (activeAgents.length > 0) {
      const agentCode = activeAgents[activeAgents.length - 1] as keyof typeof AGENT_COLORS;
      const agentInfo = AGENT_COLORS[agentCode] || AGENT_COLORS.AIKA;
      setCurrentActivity(agentInfo.action);
      return;
    }

    // Otherwise cycle through default activities
    const interval = setInterval(() => {
      setActivityIndex((prev) => {
        const next = (prev + 1) % DEFAULT_ACTIVITIES.length;
        setCurrentActivity(DEFAULT_ACTIVITIES[next]);
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [activeAgents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-end gap-2 max-w-[85%] ${className}`}
    >
      {/* Aika Avatar - Matches MessageBubble */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-blue flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-sm self-start mt-1">
        <Image
          src="/aika-human.jpeg"
          alt="Aika"
          width={32}
          height={32}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Message Bubble - Matches MessageBubble styles */}
      <div className="flex flex-col items-start">
        <div className="bg-white/90 backdrop-blur-sm text-ugm-blue-dark rounded-xl rounded-bl-none border border-gray-200/50 px-4 py-3 shadow-md min-h-[44px] flex items-center gap-3">

          {/* Animated Loader */}
          <div className="flex items-center gap-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-ugm-blue"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-ugm-blue"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-ugm-blue"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>

          {/* Dynamic Text */}
          <div className="h-5 overflow-hidden relative min-w-[140px]">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentActivity}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-ugm-blue-dark/80 font-medium absolute left-0 top-0 whitespace-nowrap"
              >
                {currentActivity}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Active Agents Icons (Mini) */}
          {activeAgents.length > 0 && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
              {activeAgents.map((agent, idx) => {
                const info = AGENT_COLORS[agent as keyof typeof AGENT_COLORS] || AGENT_COLORS.AIKA;
                return (
                  <motion.div
                    key={`${agent}-${idx}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: info.color + '20' }} // 20% opacity
                    title={info.name}
                  >
                    <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: info.color }} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Timestamp placeholder */}
        <div className="text-[10px] text-gray-500/90 ml-1 mt-1">
          Sedang mengetik...
        </div>
      </div>
    </motion.div>
  );
}
