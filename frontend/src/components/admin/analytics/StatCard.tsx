'use client';

import { motion } from 'framer-motion';

export interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color?: string;
  accentClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  change,
  trend = 'neutral',
  icon,
  color = 'blue',
  accentClass,
}) => {
  // Define UGM-themed color classes based on the color prop
  const getColorClasses = (colorName: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-ugm-blue/20', text: 'text-ugm-blue-light', border: 'border-ugm-blue/30' },
      gold: { bg: 'bg-[#FFCA40]/20', text: 'text-[#FFCA40]', border: 'border-[#FFCA40]/30' },
      green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-400/30' },
      red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-400/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-400/30' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-400/30' },
    };
    
    return colorMap[colorName] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md hover:bg-white/10 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-white/50 font-medium">{title}</p>
          <p className="mt-3 text-3xl font-bold text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {(description || change) && (
            <p className={`mt-3 text-sm font-medium ${
              trend === 'up' ? 'text-green-400' :
              trend === 'down' ? 'text-red-400' :
              'text-white/70'
            }`}>
              {description || change}
            </p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm border ${
          accentClass || `${colorClasses.bg} ${colorClasses.text} ${colorClasses.border}`
        }`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};