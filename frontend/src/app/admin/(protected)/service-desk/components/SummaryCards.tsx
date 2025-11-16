import { motion } from 'framer-motion';
import {
  FolderOpenIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface CaseRecord {
  case_id: string;
  severity: string;
  status: string;
  sla_breach_at?: string;
  assigned_to?: number;
  created_at: string;
}

interface SummaryCardsProps {
  cases: CaseRecord[];
}

export function SummaryCards({ cases }: SummaryCardsProps) {
  const stats = {
    pending: cases.filter(c => c.status === 'new').length,
    active: cases.filter(c => c.status === 'in_progress').length,
    slaRisk: cases.filter(c => {
      if (!c.sla_breach_at) return false;
      const hoursUntilBreach = (new Date(c.sla_breach_at).getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursUntilBreach < 2 && hoursUntilBreach > 0;
    }).length,
    assigned: cases.filter(c => c.assigned_to).length,
  };

  const cards = [
    {
      title: 'Pending Cases',
      value: stats.pending,
      subtitle: 'Awaiting assignment',
      icon: FolderOpenIcon,
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Active Cases',
      value: stats.active,
      subtitle: 'Currently being handled',
      icon: UserGroupIcon,
      color: 'emerald',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'SLA Breach Risk',
      value: stats.slaRisk,
      subtitle: '<2 hours remaining',
      icon: ExclamationTriangleIcon,
      color: 'red',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      iconColor: 'text-red-400',
    },
    {
      title: 'Assigned Today',
      value: stats.assigned,
      subtitle: 'Auto-assigned by CMA',
      icon: ClockIcon,
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`${card.bgColor} backdrop-blur-sm border ${card.borderColor} rounded-xl p-6`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                {card.title}
              </p>
              <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
            </div>
            <div className={`p-3 bg-white/5 rounded-lg`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>
          <p className="text-xs text-white/50">{card.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}
