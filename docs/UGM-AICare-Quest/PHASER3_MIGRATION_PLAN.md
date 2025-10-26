# Phaser 3 Migration Plan – CareQuest

**Version:** 1.0  
**Date:** October 26, 2025  
**Purpose:** Migrate CareQuest main game to Phaser 3, keep Guild/Market/Activities in Next.js

---

## Architecture Overview

### Separation of Concerns

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **Main Game (World Map, Combat, Quests)** | Phaser 3 | Real-time gameplay, exploration, typing combat, NPC interactions |
| **Guild/Social** | Next.js/React | Chat, member management, guild roster, social features |
| **Block Market** | Next.js/React | $CARE token spending (vouchers, merch, real-world rewards) |
| **Activities/Mini-games** | Next.js/React | Standalone activities callable from main webapp |
| **Auth/Profile/Settings** | Next.js/React | User management, preferences, wallet display |

### Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js App Router                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Header (React)                                       │  │
│  │  - Wallet Display ($CARE, JOY, Harmony)              │  │
│  │  - Navigation (Game | Guild | Market | Activities)   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Route: /carequest/world                              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  PhaserGame.tsx (React Wrapper)                 │  │  │
│  │  │  - Canvas container                             │  │  │
│  │  │  - Event listeners (game → React)               │  │  │
│  │  │  - Props down (React → game)                    │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │  Phaser 3 Game Engine                     │  │  │  │
│  │  │  │  - Scenes: Boot, WorldMap, Combat         │  │  │  │
│  │  │  │  - Sprites, animations, physics           │  │  │  │
│  │  │  │  - Typing mechanics, damage calculation   │  │  │  │
│  │  │  │  - NPC dialogue, quest tracking           │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Route: /carequest/guild (Pure React)                 │  │
│  │  - Guild roster, chat, management                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Route: /carequest/market (Pure React)                │  │
│  │  - $CARE spending, vouchers, merch                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Route: /carequest/activities (Pure React)            │  │
│  │  - Mini-games callable from main webapp               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│  Zustand Store   │◄────────────►│  FastAPI Backend │
│  (Shared State)  │              │  (REST API)      │
└──────────────────┘              └──────────────────┘
```

---

## File Structure

```
frontend/src/
├── app/
│   ├── carequest/
│   │   ├── world/                     # Phaser 3 game route
│   │   │   └── page.tsx               # Phaser canvas container
│   │   ├── guild/                     # Pure React (social features)
│   │   │   └── page.tsx
│   │   ├── market/                    # Pure React ($CARE spending)
│   │   │   └── page.tsx
│   │   ├── activities/                # Pure React (mini-games)
│   │   │   └── page.tsx
│   │   └── layout.tsx                 # Shared layout (header, navigation)
│   └── ...
├── game/                              # Phaser 3 game code
│   ├── config.ts                      # Phaser game configuration
│   ├── main.ts                        # Game initialization
│   ├── scenes/                        # Game scenes
│   │   ├── BootScene.ts               # Asset loading
│   │   ├── WorldMapScene.ts           # UGM campus exploration
│   │   ├── CombatScene.ts             # Typing combat
│   │   ├── DialogueScene.ts           # NPC conversations
│   │   └── QuestLogScene.ts           # Quest tracking overlay
│   ├── entities/                      # Game objects
│   │   ├── Player.ts                  # Player sprite, movement
│   │   ├── Monster.ts                 # Enemy sprites
│   │   ├── NPC.ts                     # Non-player characters
│   │   └── Projectile.ts              # Visual effects
│   ├── systems/                       # Game logic
│   │   ├── TypingEngine.ts            # Real-time typing validation
│   │   ├── CombatSystem.ts            # Damage calculation
│   │   ├── DialogueSystem.ts          # NPC dialogue trees
│   │   └── QuestSystem.ts             # Quest state management
│   ├── utils/                         # Helpers
│   │   ├── EventBridge.ts             # Phaser ↔ React communication
│   │   ├── AssetLoader.ts             # Asset management
│   │   └── SaveManager.ts             # localStorage + backend sync
│   └── types/                         # TypeScript interfaces
│       ├── GameState.ts
│       ├── Monster.ts
│       └── Quest.ts
├── components/
│   ├── game/
│   │   └── PhaserGame.tsx             # React wrapper for Phaser canvas
│   └── ...
├── store/
│   └── gameStore.ts                   # Zustand shared state
└── services/
    └── questApi.ts                    # API client (existing)
```

---

## Phase 1: Phaser 3 Setup (Week 1)

### 1.1 Install Dependencies

```bash
cd frontend
npm install phaser@3.87.0
npm install --save-dev @types/phaser
```

### 1.2 Create Phaser Configuration

**File:** `frontend/src/game/config.ts`

```typescript
import Phaser from 'phaser';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with canvas fallback
  width: 1280,
  height: 720,
  parent: 'phaser-game-container',
  backgroundColor: '#2d3561',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Top-down view
      debug: process.env.NODE_ENV === 'development',
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [], // Will register scenes in main.ts
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
};
```

### 1.3 Create Boot Scene

**File:** `frontend/src/game/scenes/BootScene.ts`

```typescript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(440, 320, 400, 50);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(450, 330, 380 * value, 30);
    });

    // Load assets
    // TODO: Replace with real assets (sprites, backgrounds, audio)
    this.load.image('ugm-campus', '/assets/backgrounds/ugm-campus-map.png');
    this.load.spritesheet('player', '/assets/sprites/player.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet('monster-anxiety', '/assets/monsters/anxiety.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('npc-aika', '/assets/npcs/aika.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    // Load sentence database
    this.load.json('sentences', '/assets/game/sentences-database.json');
  }

  create() {
    console.log('[BootScene] Assets loaded, transitioning to WorldMapScene');
    this.scene.start('WorldMapScene');
  }
}
```

### 1.4 Create World Map Scene

**File:** `frontend/src/game/scenes/WorldMapScene.ts`

```typescript
import Phaser from 'phaser';
import { EventBridge } from '../utils/EventBridge';

export class WorldMapScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private eventBridge!: EventBridge;

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  create() {
    // Event bridge for React communication
    this.eventBridge = EventBridge.getInstance();

    // Background (UGM campus map)
    this.add.image(640, 360, 'ugm-campus');

    // Player sprite
    this.player = this.physics.add.sprite(640, 360, 'player');
    this.player.setCollideWorldBounds(true);

    // Animations
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Spawn NPCs, monsters, interaction zones
    this.spawnNPC('aika', 500, 300, 'Hai! Aku Aika, virtual assistant UGM-AICare!');
    this.spawnMonsterZone(800, 400, 'Anxiety Monster');

    // UI overlays (handled by React, emit events)
    this.eventBridge.emit('game:sceneChanged', { scene: 'WorldMap' });
  }

  update() {
    // Player movement
    const speed = 160;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      this.player.anims.play('walk-down', true);
    } else {
      this.player.anims.stop();
    }
  }

  private spawnNPC(
    key: string,
    x: number,
    y: number,
    dialogue: string
  ) {
    const npc = this.physics.add.sprite(x, y, `npc-${key}`);
    npc.setInteractive();
    npc.on('pointerdown', () => {
      this.eventBridge.emit('npc:interact', { key, dialogue });
      // Optionally switch to DialogueScene
    });
  }

  private spawnMonsterZone(x: number, y: number, monsterType: string) {
    const zone = this.add.circle(x, y, 50, 0xff0000, 0.3);
    zone.setInteractive();
    zone.on('pointerdown', () => {
      console.log(`[WorldMapScene] Entering combat with ${monsterType}`);
      this.scene.start('CombatScene', { monsterType });
    });
  }
}
```

### 1.5 Create Combat Scene (Typing Mechanics)

**File:** `frontend/src/game/scenes/CombatScene.ts`

```typescript
import Phaser from 'phaser';
import { TypingEngine } from '../systems/TypingEngine';
import { CombatSystem } from '../systems/CombatSystem';
import { EventBridge } from '../utils/EventBridge';

interface CombatSceneData {
  monsterType: string;
}

export class CombatScene extends Phaser.Scene {
  private monster!: Phaser.GameObjects.Sprite;
  private typingEngine!: TypingEngine;
  private combatSystem!: CombatSystem;
  private eventBridge!: EventBridge;

  private currentSentence: string = '';
  private inputText: Phaser.GameObjects.Text;
  private sentenceText: Phaser.GameObjects.Text;
  private monsterHPBar: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: CombatSceneData) {
    this.eventBridge = EventBridge.getInstance();
    
    // Initialize systems
    const sentencesDB = this.cache.json.get('sentences');
    this.typingEngine = new TypingEngine(sentencesDB);
    this.combatSystem = new CombatSystem();

    // Generate sentence based on monster type
    this.currentSentence = this.typingEngine.getSentence({
      difficulty: 3, // TODO: Scale with Harmony rank
      category: 'Affirmations',
      language: 'en',
    });
  }

  create() {
    // Background
    this.add.rectangle(640, 360, 1280, 720, 0x1a1a2e);

    // Monster sprite
    this.monster = this.add.sprite(640, 200, 'monster-anxiety');
    this.monster.setScale(2);

    // Monster HP bar
    this.monsterHPBar = this.add.graphics();
    this.updateMonsterHP(1.0); // 100% HP

    // Sentence display
    this.sentenceText = this.add.text(640, 450, this.currentSentence, {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    // User input display
    this.inputText = this.add.text(640, 550, '', {
      fontSize: '32px',
      color: '#00ff00',
      backgroundColor: '#222',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    // Keyboard input
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      this.handleTyping(event);
    });

    this.eventBridge.emit('game:sceneChanged', { scene: 'Combat' });
  }

  private handleTyping(event: KeyboardEvent) {
    const result = this.typingEngine.handleKeyPress(event.key);

    if (result.type === 'character') {
      // Update input display with color coding
      this.inputText.setText(result.input);
      
      // Check if sentence complete
      if (result.isComplete) {
        this.handleAttack(result.wpm, result.accuracy);
      }
    } else if (result.type === 'backspace') {
      this.inputText.setText(result.input);
    }
  }

  private handleAttack(wpm: number, accuracy: number) {
    // Calculate damage
    const damage = this.combatSystem.calculateDamage({
      wpm,
      accuracy,
      upgrades: {}, // TODO: Fetch from gameStore
      combo: this.combatSystem.getComboMultiplier(),
      isCritical: Math.random() < 0.1, // 10% crit chance
    });

    // Apply damage to monster
    const newHP = this.combatSystem.applyDamage(damage);
    this.updateMonsterHP(newHP / 100); // Assuming 100 max HP

    // Visual feedback
    this.showDamageNumber(damage);
    this.cameras.main.shake(200, 0.01);

    // Check victory
    if (newHP <= 0) {
      this.handleVictory();
    } else {
      // Reset for next sentence
      this.currentSentence = this.typingEngine.getSentence({
        difficulty: 3,
        category: 'Affirmations',
        language: 'en',
      });
      this.sentenceText.setText(this.currentSentence);
      this.inputText.setText('');
      this.typingEngine.reset();
    }
  }

  private updateMonsterHP(percentage: number) {
    this.monsterHPBar.clear();
    this.monsterHPBar.fillStyle(0x00ff00);
    this.monsterHPBar.fillRect(440, 260, 400 * percentage, 20);
    this.monsterHPBar.lineStyle(2, 0xffffff);
    this.monsterHPBar.strokeRect(440, 260, 400, 20);
  }

  private showDamageNumber(damage: number) {
    const text = this.add.text(640, 200, `-${damage.toFixed(1)}`, {
      fontSize: '48px',
      color: '#ff0000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: 150,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private handleVictory() {
    // Calculate rewards
    const rewards = {
      joy_delta: 10,
      care_delta: 5,
      harmony_delta: 2,
    };

    // Emit to React layer
    this.eventBridge.emit('combat:victory', { rewards });

    // Show victory screen
    this.add.text(640, 360, 'VICTORY!', {
      fontSize: '64px',
      color: '#ffff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Return to world map after 2 seconds
    this.time.delayedCall(2000, () => {
      this.scene.start('WorldMapScene');
    });
  }
}
```

### 1.6 Create React Wrapper Component

**File:** `frontend/src/components/game/PhaserGame.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '@/game/config';
import { BootScene } from '@/game/scenes/BootScene';
import { WorldMapScene } from '@/game/scenes/WorldMapScene';
import { CombatScene } from '@/game/scenes/CombatScene';
import { EventBridge } from '@/game/utils/EventBridge';
import { useGameStore } from '@/store/gameStore';

export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { updateWellnessFromGame } = useGameStore();
  const [currentScene, setCurrentScene] = useState('Boot');

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create Phaser game instance
    const config: Phaser.Types.Core.GameConfig = {
      ...GAME_CONFIG,
      parent: containerRef.current,
      scene: [BootScene, WorldMapScene, CombatScene],
    };

    gameRef.current = new Phaser.Game(config);

    // Listen to game events
    const eventBridge = EventBridge.getInstance();

    eventBridge.on('game:sceneChanged', (data: { scene: string }) => {
      setCurrentScene(data.scene);
    });

    eventBridge.on('combat:victory', (data: { rewards: any }) => {
      console.log('[PhaserGame] Combat victory, syncing rewards:', data.rewards);
      updateWellnessFromGame(data.rewards);
    });

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [updateWellnessFromGame]);

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        id="phaser-game-container"
        className="w-full h-full"
      />

      {/* React UI overlays */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded">
        <p className="text-sm">Scene: {currentScene}</p>
        <p className="text-xs text-gray-300">
          Use arrow keys to move | Click zones to interact
        </p>
      </div>
    </div>
  );
}
```

### 1.7 Create Game Route Page

**File:** `frontend/src/app/carequest/world/page.tsx`

```typescript
import { PhaserGame } from '@/components/game/PhaserGame';

export default function CareQuestWorldPage() {
  return (
    <div className="w-full h-screen">
      <PhaserGame />
    </div>
  );
}
```

---

## Phase 2: Core Systems (Week 2)

### 2.1 Typing Engine

**File:** `frontend/src/game/systems/TypingEngine.ts`

```typescript
interface SentenceDB {
  sentences: Array<{
    text_en: string;
    text_id: string;
    difficulty: number;
    category: string;
  }>;
}

interface TypingResult {
  type: 'character' | 'backspace';
  input: string;
  isComplete: boolean;
  wpm: number;
  accuracy: number;
}

export class TypingEngine {
  private sentencesDB: SentenceDB;
  private currentSentence: string = '';
  private userInput: string = '';
  private startTime: number = 0;
  private mistakes: number = 0;

  constructor(sentencesDB: SentenceDB) {
    this.sentencesDB = sentencesDB;
  }

  getSentence(filters: {
    difficulty: number;
    category: string;
    language: 'en' | 'id';
  }): string {
    const filtered = this.sentencesDB.sentences.filter(
      (s) => s.difficulty === filters.difficulty && s.category === filters.category
    );
    const selected = filtered[Math.floor(Math.random() * filtered.length)];
    this.currentSentence = filters.language === 'en' ? selected.text_en : selected.text_id;
    this.startTime = Date.now();
    this.mistakes = 0;
    return this.currentSentence;
  }

  handleKeyPress(key: string): TypingResult {
    if (key === 'Backspace') {
      this.userInput = this.userInput.slice(0, -1);
      return {
        type: 'backspace',
        input: this.userInput,
        isComplete: false,
        wpm: 0,
        accuracy: 0,
      };
    }

    if (key.length === 1) {
      const expected = this.currentSentence[this.userInput.length];
      if (key !== expected) {
        this.mistakes++;
      }
      this.userInput += key;

      const isComplete = this.userInput === this.currentSentence;
      const wpm = isComplete ? this.calculateWPM() : 0;
      const accuracy = isComplete ? this.calculateAccuracy() : 0;

      return {
        type: 'character',
        input: this.userInput,
        isComplete,
        wpm,
        accuracy,
      };
    }

    return {
      type: 'character',
      input: this.userInput,
      isComplete: false,
      wpm: 0,
      accuracy: 0,
    };
  }

  reset() {
    this.userInput = '';
    this.startTime = Date.now();
    this.mistakes = 0;
  }

  private calculateWPM(): number {
    const timeInMinutes = (Date.now() - this.startTime) / 60000;
    const words = this.currentSentence.split(' ').length;
    return Math.round(words / timeInMinutes);
  }

  private calculateAccuracy(): number {
    const totalChars = this.currentSentence.length;
    const correctChars = totalChars - this.mistakes;
    return Math.round((correctChars / totalChars) * 100);
  }
}
```

### 2.2 Combat System

**File:** `frontend/src/game/systems/CombatSystem.ts`

```typescript
interface DamageInput {
  wpm: number;
  accuracy: number;
  upgrades: Record<string, number>;
  combo: number;
  isCritical: boolean;
}

export class CombatSystem {
  private monsterHP: number = 100;
  private comboCount: number = 0;

  calculateDamage(input: DamageInput): number {
    const baseDamage = (input.wpm / 60) * (input.accuracy / 100);
    
    const upgradeMultiplier = 
      (1 + (input.upgrades.typing_mastery || 0) * 0.15) *
      (1 + (input.upgrades.focus_enhancer || 0) * 0.10) *
      (1 + (input.upgrades.critical_insight || 0) * 0.10) *
      (1 + (input.upgrades.combo_keeper || 0) * 0.05);

    const critMultiplier = input.isCritical ? 2.0 : 1.0;
    
    return baseDamage * upgradeMultiplier * input.combo * critMultiplier;
  }

  applyDamage(damage: number): number {
    this.monsterHP -= damage;
    if (this.monsterHP < 0) this.monsterHP = 0;
    
    if (this.monsterHP > 0) {
      this.comboCount++;
    }
    
    return this.monsterHP;
  }

  getComboMultiplier(): number {
    if (this.comboCount >= 10) return 2.0;
    if (this.comboCount >= 5) return 1.5;
    if (this.comboCount >= 3) return 1.2;
    return 1.0;
  }

  resetCombo() {
    this.comboCount = 0;
  }

  reset() {
    this.monsterHP = 100;
    this.comboCount = 0;
  }
}
```

### 2.3 Event Bridge (Phaser ↔ React)

**File:** `frontend/src/game/utils/EventBridge.ts`

```typescript
type EventCallback = (data: any) => void;

export class EventBridge {
  private static instance: EventBridge;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  static getInstance(): EventBridge {
    if (!EventBridge.instance) {
      EventBridge.instance = new EventBridge();
    }
    return EventBridge.instance;
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => callback(data));
    }
  }

  off(event: string, callback: EventCallback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}
```

---

## Phase 3: React Features (Week 3-4)

### 3.1 Zustand Shared State

**File:** `frontend/src/store/gameStore.ts`

```typescript
import { create } from 'zustand';
import { updateWellnessState } from '@/services/questApi';

interface GameState {
  joy: number;
  care: number;
  harmony: number;
  
  updateWellnessFromGame: (deltas: {
    joy_delta?: number;
    care_delta?: number;
    harmony_delta?: number;
  }) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  joy: 0,
  care: 0,
  harmony: 0,

  updateWellnessFromGame: async (deltas) => {
    try {
      const response = await updateWellnessState(deltas);
      set({
        joy: response.joy,
        care: response.care,
        harmony: response.harmony,
      });
    } catch (error) {
      console.error('[gameStore] Failed to sync wellness:', error);
    }
  },
}));
```

### 3.2 Guild Page (Pure React)

**File:** `frontend/src/app/carequest/guild/page.tsx`

```typescript
'use client';

export default function GuildPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Guild System</h1>
      
      {/* Guild roster */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Guild Members</h2>
        {/* TODO: Fetch and display guild members */}
      </section>

      {/* Guild chat */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Guild Chat</h2>
        {/* TODO: Real-time chat component */}
      </section>

      {/* Guild management */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Guild Settings</h2>
        {/* TODO: Guild admin controls */}
      </section>
    </div>
  );
}
```

### 3.3 Block Market Page (Pure React)

**File:** `frontend/src/app/carequest/market/page.tsx`

```typescript
'use client';

export default function BlockMarketPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Block Market</h1>
      <p className="text-gray-600 mb-8">
        Spend your $CARE tokens on real-world vouchers and UGM merchandise!
      </p>

      {/* Voucher catalog */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Vouchers</h2>
        {/* TODO: Fetch and display vouchers */}
      </section>

      {/* Merch catalog */}
      <section>
        <h2 className="text-xl font-semibold mb-4">UGM Merchandise</h2>
        {/* TODO: Fetch and display merch */}
      </section>
    </div>
  );
}
```

### 3.4 Activities Page (Pure React)

**File:** `frontend/src/app/carequest/activities/page.tsx`

```typescript
'use client';

export default function ActivitiesPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Activities & Mini-Games</h1>
      
      {/* Activity cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Daily Mindfulness</h3>
          <p className="text-sm text-gray-600 mb-4">
            Complete a 5-minute breathing exercise
          </p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded">
            Start Activity
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Mood Journal</h3>
          <p className="text-sm text-gray-600 mb-4">
            Record your emotions today
          </p>
          <button className="bg-green-500 text-white px-4 py-2 rounded">
            Open Journal
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">CBT Workshop</h3>
          <p className="text-sm text-gray-600 mb-4">
            Practice cognitive reframing
          </p>
          <button className="bg-purple-500 text-white px-4 py-2 rounded">
            Start Workshop
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Migration Checklist

### Phase 1: Foundation (Week 1)
- [x] Install Phaser 3 and TypeScript types
- [ ] Create Phaser configuration (`config.ts`)
- [ ] Implement BootScene (asset loading)
- [ ] Implement WorldMapScene (player movement, NPC spawning)
- [ ] Implement CombatScene (typing mechanics)
- [ ] Create PhaserGame React wrapper
- [ ] Create `/carequest/world` route
- [ ] Test: Player can move, interact with NPCs, enter combat

### Phase 2: Core Systems (Week 2)
- [ ] Implement TypingEngine (WPM, accuracy calculation)
- [ ] Implement CombatSystem (damage formulas, combo tracking)
- [ ] Implement EventBridge (Phaser ↔ React events)
- [ ] Implement SaveManager (localStorage + backend sync)
- [ ] Test: Typing mechanics work, damage calculated correctly, rewards sync to backend

### Phase 3: React Features (Week 3-4)
- [ ] Create Zustand gameStore (shared state)
- [ ] Implement Guild page (roster, chat, management)
- [ ] Implement Block Market page (vouchers, merch)
- [ ] Implement Activities page (mini-games, callable from main app)
- [ ] Update Header navigation (Game | Guild | Market | Activities)
- [ ] Test: All pages accessible, state syncs correctly

### Phase 4: Assets & Polish (Week 5-6)
- [ ] Generate UGM campus map background
- [ ] Generate player sprite (walk animations, idle)
- [ ] Generate monster sprites (5 common + 5 bosses)
- [ ] Generate NPC sprites (Aika, counselors)
- [ ] Add particle effects (damage numbers, critical hits, victory celebrations)
- [ ] Add sound effects (typing clicks, combat sounds, ambient music)
- [ ] Test: Game feels polished, assets load correctly

### Phase 5: Integration & Testing (Week 7)
- [ ] E2E test: Complete combat session → rewards sync to backend
- [ ] E2E test: Navigate between Game/Guild/Market/Activities
- [ ] Performance test: 60 FPS on target devices (Android 8+, iOS 12+)
- [ ] Accessibility test: Keyboard navigation, screen reader support
- [ ] Load test: Verify backend handles game event spikes
- [ ] User testing: 10 student volunteers provide feedback

---

## Success Criteria

### Technical
✅ Phaser 3 game runs at 60 FPS on target devices  
✅ Typing engine latency <50ms  
✅ Combat rewards sync to backend within 5 seconds  
✅ All React pages accessible via navigation  
✅ No memory leaks in Phaser game loop  

### User Experience
✅ First-time player completes tutorial within 5 minutes  
✅ Combat session lasts 8-12 minutes (optimal engagement)  
✅ Guild/Market/Activities feel integrated, not isolated  
✅ Smooth transitions between game and React pages  

### Business
✅ ≥40% pilot users try game within 7 days  
✅ ≥25% return for 3+ sessions within 14 days  
✅ Zero reports of triggering content or addiction patterns  
✅ $CARE token usage in Block Market increases by ≥20%  

---

## Next Steps

1. **Immediate (Today):**
   - Install Phaser 3: `npm install phaser@3.87.0 @types/phaser`
   - Create `/game` directory structure
   - Copy starter files (BootScene, WorldMapScene, CombatScene)

2. **Short-term (This Week):**
   - Implement core systems (TypingEngine, CombatSystem, EventBridge)
   - Test typing mechanics in CombatScene
   - Verify backend sync with test combat session

3. **Mid-term (Next 2 Weeks):**
   - Build React pages (Guild, Market, Activities)
   - Integrate Zustand shared state
   - Generate UGM campus map background

4. **Long-term (Next 4-6 Weeks):**
   - Generate all sprite assets
   - Add particle effects and sound
   - User testing with 10 volunteers
   - Launch pilot rollout with `feat.carequest_phaser.m1` flag

---

**Document Control:**  
**Version:** 1.0  
**Last Updated:** October 26, 2025  
**Owner:** UGM-AICare Development Team  
**Status:** Ready for Implementation
