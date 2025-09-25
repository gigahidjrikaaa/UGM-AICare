'use client';

import { motion } from 'framer-motion';

export interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  accentClass,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner backdrop-blur"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-white/50">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="mt-2 text-xs text-white/60">{description}</p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClass}`}>{icon}</div>
    </div>
  </motion.div>
);