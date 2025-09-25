'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

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
    critical: 'border-rose-400/50 bg-rose-500/10',
    high: 'border-amber-400/50 bg-amber-500/10',
    normal: 'border-white/10 bg-white/5',
  };

  return (
    <div className={`rounded-2xl border ${priorityColors[priority]} transition-all duration-200`}>
      <button
        onClick={() => onToggle(id)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-[#FFCA40]">{icon}</div>}
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description && <p className="text-sm text-white/60 mt-1">{description}</p>}
          </div>
        </div>
        <div className="text-white/60">
          {isExpanded ? <FiChevronUp className="h-5 w-5" /> : <FiChevronDown className="h-5 w-5" />}
        </div>
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
    </div>
  );
};