// Game type definitions for CareQuest Idle Clicker

export interface Monster {
  id: string;
  name: string;
  type: 'common' | 'boss';
  icon: string;
  currentHp: number;
  maxHp: number;
  rewards: {
    joy: number;
    care: number;
  };
}

export interface UpgradeLevel {
  level: number;
  cost: number;
  value: number;
}

export interface GameState {
  joy: number;
  care: number;
  harmony: number;
  stage: number;
  tapDamage: number;
  dps: number;
  currentMonster: Monster;
  totalMonstersDefeated: number;
  upgrades: {
    tapDamage: UpgradeLevel;
    autoClicker: UpgradeLevel;
    criticalChance: UpgradeLevel;
    careMultiplier: UpgradeLevel;
  };
}

export interface MonsterType {
  name: string;
  icon: string;
  hpMultiplier: number;
  joyMultiplier: number;
  careMultiplier: number;
}

export interface BossType {
  name: string;
  icon: string;
  hpMultiplier: number;
  joyMultiplier: number;
  careMultiplier: number;
}

export interface HarmonyRank {
  minHarmony: number;
  name: string;
  icon: string;
  bonusMultiplier: number;
}
