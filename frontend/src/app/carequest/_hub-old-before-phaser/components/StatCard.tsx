import { FiZap, FiTarget, FiHeart, FiSmile } from '@/icons';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: 'zap' | 'target' | 'heart' | 'smile';
  color: string;
}

const iconMap = {
  zap: FiZap,
  target: FiTarget,
  heart: FiHeart,
  smile: FiSmile,
};

export function StatCard({ label, value, icon, color }: StatCardProps) {
  const Icon = iconMap[icon];
  
  return (
    <div className={cn(
      'bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10',
      'hover:border-white/20 transition-all duration-300'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-5 h-5', color)} />
        <span className="text-sm text-white/60 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
