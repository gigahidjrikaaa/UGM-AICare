/**
 * Aika Loading Message Bubble
 * 
 * Displays a loading state with agent activity indicators
 * showing which agents are currently processing the request.
 */

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { CompactAgentActivity } from './AgentActivityIndicator';

interface AikaLoadingBubbleProps {
  activeAgents?: string[];
  className?: string;
}

export function AikaLoadingBubble({ activeAgents = [], className = '' }: AikaLoadingBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-start gap-2 max-w-[85%] ${className}`}
    >
      {/* Aika Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 p-0.5">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <Image
              src="/aika-human.jpeg"
              alt="Aika"
              width={24}
              height={24}
              className="rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Message Bubble */}
      <div className="flex-1">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 border border-white/20 shadow-lg">
          {/* Typing animation dots */}
          <div className="flex items-center gap-1 mb-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>

          {/* Agent Activity */}
          <CompactAgentActivity activeAgents={activeAgents} />
        </div>

        {/* Timestamp placeholder */}
        <p className="text-[10px] text-white/40 mt-1 ml-2">
          Just now
        </p>
      </div>
    </motion.div>
  );
}
