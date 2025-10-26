// Game constants for monsters, bosses, and harmony ranks

import { MonsterType, BossType, HarmonyRank } from './types';

export const MONSTER_TYPES: MonsterType[] = [
  { name: 'Anxiety Goblin', icon: 'Monster', hpMultiplier: 1, joyMultiplier: 1, careMultiplier: 0.5 },
  { name: 'Stress Slime', icon: 'Slime', hpMultiplier: 1.2, joyMultiplier: 1.1, careMultiplier: 0.6 },
  { name: 'Burnout Beast', icon: 'Beast', hpMultiplier: 1.5, joyMultiplier: 1.3, careMultiplier: 0.8 },
  { name: 'Procrastination Imp', icon: 'Imp', hpMultiplier: 0.8, joyMultiplier: 0.9, careMultiplier: 0.4 },
  { name: 'Loneliness Wraith', icon: 'Ghost', hpMultiplier: 1.3, joyMultiplier: 1.2, careMultiplier: 0.7 },
];

export const BOSS_TYPES: BossType[] = [
  { name: 'Exam Week Demon', icon: 'Boss', hpMultiplier: 10, joyMultiplier: 5, careMultiplier: 3 },
  { name: 'Thesis Dragon', icon: 'Dragon', hpMultiplier: 15, joyMultiplier: 7, careMultiplier: 4 },
  { name: 'Social Pressure Titan', icon: 'Titan', hpMultiplier: 20, joyMultiplier: 10, careMultiplier: 5 },
  { name: 'Perfectionism Hydra', icon: 'Hydra', hpMultiplier: 25, joyMultiplier: 12, careMultiplier: 6 },
  { name: 'Imposter Syndrome Leviathan', icon: 'Leviathan', hpMultiplier: 30, joyMultiplier: 15, careMultiplier: 8 },
];

export const HARMONY_RANKS: HarmonyRank[] = [
  { minHarmony: 0, name: 'Struggling', icon: 'Seed', bonusMultiplier: 1 },
  { minHarmony: 100, name: 'Coping', icon: 'Sprout', bonusMultiplier: 1.2 },
  { minHarmony: 500, name: 'Balanced', icon: 'Plant', bonusMultiplier: 1.5 },
  { minHarmony: 2000, name: 'Flourishing', icon: 'Tree', bonusMultiplier: 2 },
  { minHarmony: 10000, name: 'Thriving', icon: 'Forest', bonusMultiplier: 3 },
  { minHarmony: 50000, name: 'Enlightened', icon: 'Sun', bonusMultiplier: 5 },
];

export const SAVE_KEY = 'carequest-idle-save';
