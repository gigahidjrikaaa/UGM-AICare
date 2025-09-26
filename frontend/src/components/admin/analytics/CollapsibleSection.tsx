'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';

export interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  priority?: 'critical' | 'high' | 'normal';
  expandedSections: Set<string>;
  onToggle: (id: string) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  description,
  icon,
  children,
  priority = 'normal',
  expandedSections,
  onToggle,
}) => {
  const isExpanded = expandedSections.has(id);
  const priorityColors = {
    critical: 'border-red-400/50 bg-red-500/10 shadow-lg shadow-red-500/20',
    high: 'border-[#FFCA40]/50 bg-[#FFCA40]/10 shadow-lg shadow-[#FFCA40]/20',
    normal: 'border-white/20 bg-white/5 shadow-xl shadow-black/20',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border backdrop-blur-md ${priorityColors[priority]} transition-all duration-300 hover:border-white/30`}
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/10 transition-all duration-300 rounded-t-2xl group"
      >
        <div className="flex items-center gap-4">
          {icon && (
            <div className="bg-[#FFCA40]/20 rounded-full p-2 group-hover:bg-[#FFCA40]/30 transition-colors duration-300">
              <div className="text-[#FFCA40]">{icon}</div>
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#FFCA40] transition-colors duration-300">{title}</h3>
            {description && <p className="text-sm text-white/60 mt-1 group-hover:text-white/80 transition-colors duration-300">{description}</p>}
          </div>
        </div>
        <motion.div 
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-white/60 group-hover:text-[#FFCA40] transition-colors duration-300"
        >
          <FiChevronDown className="h-5 w-5" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};