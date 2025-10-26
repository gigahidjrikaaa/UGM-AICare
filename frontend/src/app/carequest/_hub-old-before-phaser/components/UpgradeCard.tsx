import { cn } from '@/lib/utils';

interface UpgradeCardProps {
  title: string;
  description: string;
  level: number;
  cost: number;
  currentValue: number | string;
  nextValue: number | string;
  currency: 'joy' | 'care';
  canAfford: boolean;
  onUpgrade: () => void;
}

export function UpgradeCard({
  title,
  description,
  level,
  cost,
  currentValue,
  nextValue,
  currency,
  canAfford,
  onUpgrade,
}: UpgradeCardProps) {
  const currencyColor = currency === 'joy' ? 'text-[#FFCA40]' : 'text-[#5EEAD4]';
  
  return (
    <div className={cn(
      'bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10',
      'hover:border-white/20 transition-all duration-300'
    )}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="text-sm text-white/60">Level {level}</p>
        </div>
        <div className="text-right">
          <div className={cn('text-sm font-bold', currencyColor)}>
            {cost.toLocaleString()} {currency.toUpperCase()}
          </div>
        </div>
      </div>
      
      <p className="text-sm text-white/70 mb-3">{description}</p>
      
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-white/60">Current: {currentValue}</span>
        <span className="text-white/40">→</span>
        <span className="text-[#5EEAD4]">Next: {nextValue}</span>
      </div>
      
      <button
        onClick={onUpgrade}
        disabled={!canAfford}
        className={cn(
          'w-full py-2 rounded-lg font-bold transition-all duration-300',
          canAfford
            ? 'bg-[#FFCA40] text-black hover:bg-[#FFD960] hover:scale-105'
            : 'bg-white/10 text-white/40 cursor-not-allowed'
        )}
      >
        {canAfford ? 'Upgrade' : 'Not Enough Resources'}
      </button>
    </div>
  );
}
