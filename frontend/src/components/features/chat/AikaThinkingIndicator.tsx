'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, CheckCircle2, Loader2 } from 'lucide-react';

interface AgentStatusUpdate {
  type: 'thinking' | 'status' | 'agent' | 'complete';
  message?: string;
  node?: string;
  agent?: string;
  name?: string;
  description?: string;
}

interface AikaThinkingIndicatorProps {
  status: AgentStatusUpdate | null;
  isActive: boolean;
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  aika_decision: <Brain className="h-4 w-4" />,
  sta_subgraph: <Zap className="h-4 w-4" />,
  sca_subgraph: <CheckCircle2 className="h-4 w-4" />,
  sda_subgraph: <Loader2 className="h-4 w-4 animate-spin" />,
  synthesize_response: <CheckCircle2 className="h-4 w-4" />,
};

export function AikaThinkingIndicator({ status, isActive }: AikaThinkingIndicatorProps) {
  if (!isActive || !status) {
    return null;
  }

  const getIcon = () => {
    if (status.type === 'thinking') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (status.type === 'agent') {
      return <Zap className="h-4 w-4" />;
    }
    if (status.type === 'status' && status.node) {
      return NODE_ICONS[status.node] || <Brain className="h-4 w-4" />;
    }
    if (status.type === 'complete') {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    return <Brain className="h-4 w-4" />;
  };

  const getMessage = () => {
    if (status.type === 'agent' && status.name) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{status.name}</span>
          {status.description && (
            <span className="text-xs text-white/70">{status.description}</span>
          )}
        </div>
      );
    }
    return <span>{status.message || 'Memproses...'}</span>;
  };

  const getBackgroundClass = () => {
    if (status.type === 'agent') {
      return 'from-ugm-gold/20 to-orange-500/20 border-ugm-gold/30';
    }
    if (status.type === 'complete') {
      return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    }
    return 'from-ugm-blue/20 to-blue-600/20 border-ugm-blue/30';
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${status.type}-${status.node || status.agent || 'default'}`}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`inline-flex items-start gap-2.5 rounded-xl border bg-gradient-to-br px-3.5 py-2.5 shadow-lg backdrop-blur-sm ${getBackgroundClass()}`}
      >
        <div className="flex-shrink-0 mt-0.5 text-white/90">
          {getIcon()}
        </div>
        <div className="flex-1 text-sm text-white/90">
          {getMessage()}
        </div>
        
        {/* Animated dots for ongoing processes */}
        {(status.type === 'thinking' || status.type === 'status') && (
          <div className="flex items-center gap-1 mt-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-white/60"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact version for message bubble loading state
 */
export function AikaThinkingCompact({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <Loader2 className="h-4 w-4 animate-spin text-ugm-blue" />
      <span className="text-sm text-ugm-blue-dark">
        {message || 'Aika sedang mengetik...'}
      </span>
      <div className="flex items-center gap-1 ml-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ugm-blue/40"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
