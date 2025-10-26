// Game logic utility functions

import { Monster, HarmonyRank, GameState } from '../types';
import { MONSTER_TYPES, BOSS_TYPES, HARMONY_RANKS, SAVE_KEY } from '../constants';

export function generateMonster(stage: number, isBoss: boolean): Monster {
  const templates = isBoss ? BOSS_TYPES : MONSTER_TYPES;
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const baseHp = isBoss ? stage * 500 : stage * 100;
  const maxHp = Math.floor(baseHp * template.hpMultiplier);
  
  const baseJoy = isBoss ? stage * 50 : stage * 10;
  const basecare = isBoss ? stage * 20 : stage * 5;
  
  return {
    id: `${template.name}-${Date.now()}`,
    name: template.name,
    type: isBoss ? 'boss' : 'common',
    icon: template.icon,
    currentHp: maxHp,
    maxHp,
    rewards: {
      joy: Math.floor(baseJoy * template.joyMultiplier),
      care: Math.floor(basecare * template.careMultiplier),
    },
  };
}

export function calculateUpgradeCost(baseLevel: number, level: number): number {
  return Math.floor(baseLevel * Math.pow(1.15, level));
}

export function getCurrentRank(harmony: number): HarmonyRank {
  for (let i = HARMONY_RANKS.length - 1; i >= 0; i--) {
    if (harmony >= HARMONY_RANKS[i].minHarmony) {
      return HARMONY_RANKS[i];
    }
  }
  return HARMONY_RANKS[0];
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game:', error);
  }
}

export function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load game:', error);
  }
  return null;
}

export function getInitialGameState(): GameState {
  return {
    joy: 0,
    care: 0,
    harmony: 0,
    stage: 1,
    tapDamage: 1,
    dps: 0,
    currentMonster: generateMonster(1, false),
    totalMonstersDefeated: 0,
    upgrades: {
      tapDamage: { level: 0, cost: 10, value: 1 },
      autoClicker: { level: 0, cost: 50, value: 0 },
      criticalChance: { level: 0, cost: 100, value: 0 },
      careMultiplier: { level: 0, cost: 200, value: 1 },
    },
  };
}
