import { motion } from 'framer-motion';
import { Monster } from '../types';
import { cn } from '@/lib/utils';

interface MonsterDisplayProps {
  monster: Monster;
  onTap: () => void;
}

export function MonsterDisplay({ monster, onTap }: MonsterDisplayProps) {
  const hpPercentage = (monster.currentHp / monster.maxHp) * 100;
  const isBoss = monster.type === 'boss';
  
  return (
    <div className="relative">
      {/* Monster Card */}
      <motion.div
        className={cn(
          'relative bg-gradient-to-br rounded-2xl p-8 border-2',
          isBoss
            ? 'from-red-900/20 to-purple-900/20 border-red-500/50'
            : 'from-blue-900/20 to-cyan-900/20 border-cyan-500/30'
        )}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Boss Badge */}
        {isBoss && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            BOSS
          </div>
        )}
        
        {/* Monster Info */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{monster.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{monster.name}</h2>
          <div className="text-sm text-white/60">
            Stage {Math.floor(monster.maxHp / (isBoss ? 500 : 100))}
          </div>
        </div>
        
        {/* HP Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80">HP</span>
            <span className="text-white font-mono">
              {monster.currentHp.toLocaleString()} / {monster.maxHp.toLocaleString()}
            </span>
          </div>
          <div className="h-4 bg-black/30 rounded-full overflow-hidden border border-white/10">
            <motion.div
              className={cn(
                'h-full',
                isBoss
                  ? 'bg-gradient-to-r from-red-500 to-purple-500'
                  : 'bg-gradient-to-r from-green-500 to-cyan-500'
              )}
              initial={{ width: '100%' }}
              animate={{ width: `${hpPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        
        {/* Tap Button */}
        <motion.button
          onClick={onTap}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-lg',
            'bg-gradient-to-r transition-all duration-300',
            isBoss
              ? 'from-red-500 to-purple-500 hover:from-red-400 hover:to-purple-400'
              : 'from-[#FFCA40] to-[#FFD960] text-black hover:from-[#FFD960] hover:to-[#FFCA40]'
          )}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          Attack!
        </motion.button>
        
        {/* Rewards */}
        <div className="mt-4 flex gap-4 justify-center text-sm">
          <div className="flex items-center gap-1">
            <span className="text-[#FFCA40]">+{monster.rewards.joy.toLocaleString()}</span>
            <span className="text-white/60">JOY</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#5EEAD4]">+{monster.rewards.care.toLocaleString()}</span>
            <span className="text-white/60">CARE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
