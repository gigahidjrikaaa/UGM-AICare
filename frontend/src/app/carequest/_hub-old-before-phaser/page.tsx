'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCcw, FiAward } from '@/icons';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { GameState } from './types';
import { 
  generateMonster, 
  calculateUpgradeCost, 
  getCurrentRank,
  saveGame,
  loadGame,
  getInitialGameState
} from './utils/gameLogic';

import { StatCard } from './components/StatCard';
import { UpgradeCard } from './components/UpgradeCard';
import { MonsterDisplay } from './components/MonsterDisplay';
import { useWellnessState, WELLNESS_QUERY_KEY } from '@/hooks/useQuests';
import { updateWellnessState } from '@/services/questApi';

export default function CareQuestGamePage() {
  const queryClient = useQueryClient();
  const { data: wellnessData, isLoading: wellnessLoading } = useWellnessState();
  
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [showDamage, setShowDamage] = useState<string | null>(null);
  const pendingUpdatesRef = useRef({ joy: 0, care: 0, harmony: 0 });

  // Initialize game state from backend wellness data
  useEffect(() => {
    if (wellnessData && !wellnessLoading) {
      const savedGame = loadGame();
      if (savedGame) {
        // Sync backend values with local save
        setGameState({
          ...savedGame,
          joy: Math.round(wellnessData.joy_balance),
          care: Math.round(wellnessData.care_balance),
          harmony: Math.round(wellnessData.harmony_score),
        });
      } else {
        // Initialize from backend
        setGameState(prev => ({
          ...prev,
          joy: Math.round(wellnessData.joy_balance),
          care: Math.round(wellnessData.care_balance),
          harmony: Math.round(wellnessData.harmony_score),
        }));
      }
    }
  }, [wellnessData, wellnessLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveGame(gameState);
      
      // Sync pending updates to backend every 5 seconds
      if (pendingUpdatesRef.current.joy > 0 || pendingUpdatesRef.current.care > 0 || pendingUpdatesRef.current.harmony > 0) {
        const syncUpdates = async () => {
          try {
            const updates = { ...pendingUpdatesRef.current };
            pendingUpdatesRef.current = { joy: 0, care: 0, harmony: 0 }; // Reset pending
            
            await updateWellnessState({
              joy_delta: updates.joy,
              care_delta: updates.care,
              harmony_delta: updates.harmony,
            });
            
            // Invalidate wellness query to refresh header
            queryClient.invalidateQueries({ queryKey: WELLNESS_QUERY_KEY });
          } catch (error) {
            console.error('Failed to sync wellness:', error);
            toast.error('Failed to sync progress to server');
          }
        };
        syncUpdates();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [gameState, queryClient]);

  // Deal damage to monster
  const dealDamage = useCallback((damage: number, showFloatingText: boolean) => {
    setGameState((prev) => {
      const newMonster = { ...prev.currentMonster };
      newMonster.currentHp = Math.max(0, newMonster.currentHp - damage);

      if (showFloatingText) {
        setShowDamage(`-${damage}`);
        setTimeout(() => setShowDamage(null), 1000);
      }

      if (newMonster.currentHp <= 0) {
        const joyReward = newMonster.rewards.joy;
        const careReward = newMonster.rewards.care;
        const harmonyReward = Math.floor((joyReward + careReward) / 10);
        
        const newJoy = prev.joy + joyReward;
        const newCare = prev.care + careReward;
        const newHarmony = prev.harmony + harmonyReward;
        const newMonstersDefeated = prev.totalMonstersDefeated + 1;
        
        // Track rewards for backend sync
        pendingUpdatesRef.current.joy += joyReward;
        pendingUpdatesRef.current.care += careReward;
        pendingUpdatesRef.current.harmony += harmonyReward;
        
        const isBoss = newMonstersDefeated % 10 === 0;
        const newStage = isBoss ? prev.stage : prev.stage + 1;
        
        // Show toast for rewards
        toast.success(`+${joyReward} JOY, +${careReward} CARE, +${harmonyReward} Harmony!`, {
          icon: '🎉',
          duration: 2000,
        });
        
        return {
          ...prev,
          joy: newJoy,
          care: newCare,
          harmony: newHarmony,
          stage: newStage,
          totalMonstersDefeated: newMonstersDefeated,
          currentMonster: generateMonster(newStage, isBoss),
        };
      }

      return { ...prev, currentMonster: newMonster };
    });
  }, []);

  // Auto-clicker (DPS)
  useEffect(() => {
    if (gameState.dps > 0) {
      const interval = setInterval(() => {
        dealDamage(gameState.dps, false);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.dps, dealDamage]);

  const handleTap = useCallback(() => {
    const critRoll = Math.random();
    const isCrit = critRoll < (gameState.upgrades.criticalChance.value / 100);
    const damage = isCrit ? gameState.tapDamage * 2 : gameState.tapDamage;
    
    dealDamage(damage, true);
  }, [gameState.tapDamage, gameState.upgrades.criticalChance.value, dealDamage]);

  const handleUpgrade = useCallback((upgradeType: keyof GameState['upgrades']) => {
    setGameState((prev) => {
      const upgrade = prev.upgrades[upgradeType];
      const cost = upgrade.cost;
      
      const canAfford = upgradeType === 'careMultiplier' 
        ? prev.care >= cost 
        : prev.joy >= cost;
      
      if (!canAfford) return prev;

      const newLevel = upgrade.level + 1;
      const newCost = calculateUpgradeCost(
        upgradeType === 'tapDamage' ? 10 :
        upgradeType === 'autoClicker' ? 50 :
        upgradeType === 'criticalChance' ? 100 : 200,
        newLevel
      );

      let newValue = upgrade.value;
      let newTapDamage = prev.tapDamage;
      let newDps = prev.dps;

      switch (upgradeType) {
        case 'tapDamage':
          newValue = newLevel + 1;
          newTapDamage = newValue;
          break;
        case 'autoClicker':
          newValue = newLevel;
          newDps = newValue;
          break;
        case 'criticalChance':
          newValue = Math.min(50, newLevel * 2);
          break;
        case 'careMultiplier':
          newValue = 1 + (newLevel * 0.1);
          break;
      }

      return {
        ...prev,
        joy: upgradeType === 'careMultiplier' ? prev.joy : prev.joy - cost,
        care: upgradeType === 'careMultiplier' ? prev.care - cost : prev.care,
        tapDamage: newTapDamage,
        dps: newDps,
        upgrades: {
          ...prev.upgrades,
          [upgradeType]: {
            level: newLevel,
            cost: newCost,
            value: newValue,
          },
        },
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset your progress?')) {
      setGameState(getInitialGameState());
      localStorage.removeItem('carequest-idle-save');
    }
  }, []);

  const currentRank = getCurrentRank(gameState.harmony);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#010a1f] via-[#0a1628] to-[#010a1f] p-8 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FFCA40] to-[#5EEAD4] bg-clip-text text-transparent">
              CareQuest Idle Clicker
            </h1>
            <p className="text-white/60 mt-2">Defeat mental health challenges and grow stronger!</p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all"
          >
            <FiRefreshCcw className="w-4 h-4" />
            Reset Game
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="JOY" value={gameState.joy} icon="smile" color="text-[#FFCA40]" />
          <StatCard label="CARE" value={gameState.care} icon="heart" color="text-[#5EEAD4]" />
          <StatCard label="Harmony" value={gameState.harmony} icon="zap" color="text-purple-400" />
          <StatCard label="Stage" value={gameState.stage} icon="target" color="text-cyan-400" />
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiAward className="w-6 h-6 text-[#FFCA40]" />
              <div>
                <div className="text-sm text-white/60">Harmony Rank</div>
                <div className="text-xl font-bold text-[#FFCA40]">{currentRank.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">Bonus Multiplier</div>
              <div className="text-xl font-bold text-[#5EEAD4]">x{currentRank.bonusMultiplier}</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="relative">
            <MonsterDisplay monster={gameState.currentMonster} onTap={handleTap} />
            
            {showDamage && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-red-500 pointer-events-none"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -50 }}
                transition={{ duration: 1 }}
              >
                {showDamage}
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Upgrades</h2>
            
            <UpgradeCard
              title="Tap Damage"
              description="Increase damage per click"
              level={gameState.upgrades.tapDamage.level}
              cost={gameState.upgrades.tapDamage.cost}
              currentValue={gameState.upgrades.tapDamage.value}
              nextValue={gameState.upgrades.tapDamage.value + 1}
              currency="joy"
              canAfford={gameState.joy >= gameState.upgrades.tapDamage.cost}
              onUpgrade={() => handleUpgrade('tapDamage')}
            />
            
            <UpgradeCard
              title="Auto Clicker"
              description="Automatically deal damage per second"
              level={gameState.upgrades.autoClicker.level}
              cost={gameState.upgrades.autoClicker.cost}
              currentValue={gameState.upgrades.autoClicker.value}
              nextValue={gameState.upgrades.autoClicker.value + 1}
              currency="joy"
              canAfford={gameState.joy >= gameState.upgrades.autoClicker.cost}
              onUpgrade={() => handleUpgrade('autoClicker')}
            />
            
            <UpgradeCard
              title="Critical Chance"
              description="Chance to deal 2x damage (max 50%)"
              level={gameState.upgrades.criticalChance.level}
              cost={gameState.upgrades.criticalChance.cost}
              currentValue={`${gameState.upgrades.criticalChance.value}%`}
              nextValue={`${Math.min(50, (gameState.upgrades.criticalChance.level + 1) * 2)}%`}
              currency="joy"
              canAfford={gameState.joy >= gameState.upgrades.criticalChance.cost}
              onUpgrade={() => handleUpgrade('criticalChance')}
            />
            
            <UpgradeCard
              title="CARE Multiplier"
              description="Increase CARE earned from monsters"
              level={gameState.upgrades.careMultiplier.level}
              cost={gameState.upgrades.careMultiplier.cost}
              currentValue={`x${gameState.upgrades.careMultiplier.value.toFixed(1)}`}
              nextValue={`x${(gameState.upgrades.careMultiplier.value + 0.1).toFixed(1)}`}
              currency="care"
              canAfford={gameState.care >= gameState.upgrades.careMultiplier.cost}
              onUpgrade={() => handleUpgrade('careMultiplier')}
            />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-white/40">
          <p>Tap Damage: {gameState.tapDamage} | DPS: {gameState.dps} | Crit Chance: {gameState.upgrades.criticalChance.value}%</p>
          <p className="mt-1">Total Monsters Defeated: {gameState.totalMonstersDefeated}</p>
        </div>
      </div>
    </div>
  );
}
