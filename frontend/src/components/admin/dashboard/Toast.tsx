'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import { EASE } from './primitives';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', isVisible, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const config = {
    success: {
      icon: CheckCircleIcon,
      chip: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25',
      bar: 'bg-emerald-400',
    },
    error: {
      icon: XCircleIcon,
      chip: 'bg-red-500/10 text-red-300 ring-red-500/25',
      bar: 'bg-red-400',
    },
    info: {
      icon: InformationCircleIcon,
      chip: 'bg-blue-500/10 text-blue-300 ring-blue-500/25',
      bar: 'bg-blue-400',
    },
  };

  const { icon: Icon, chip, bar } = config[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -32, scale: 0.96, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -16, scale: 0.97, filter: 'blur(4px)' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed right-4 top-4 z-[100] max-w-md"
        >
          <div className="overflow-hidden rounded-[1.5rem] bg-[#020b22]/85 p-1 shadow-[0_16px_60px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/12">
            <div className="flex items-start gap-3 rounded-[calc(1.5rem-0.375rem)] bg-white/[0.03] p-4">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${chip}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="flex-1 text-sm leading-snug text-white/85">{message}</p>
              <button
                onClick={onClose}
                className="text-white/35 transition-colors duration-500 hover:text-white/80"
                aria-label="Close notification"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress — scaleX, transform-only */}
            <div className="mx-1.5 mb-1.5 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                style={{ transformOrigin: 'left' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className={`h-full rounded-full ${bar}`}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
