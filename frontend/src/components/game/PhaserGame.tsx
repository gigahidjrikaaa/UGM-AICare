'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { GAME_CONFIG } from '@/game/config';
import { BootScene } from '@/game/scenes/BootScene';
import { MenuScene } from '@/game/scenes/MenuScene';
import { WorldMapScene } from '@/game/scenes/WorldMapScene';
import { CombatScene } from '@/game/scenes/CombatScene';
import { CareQuestHubScene } from '@/game/scenes/CareQuestHubScene';
import { EventBridge } from '@/game/utils/EventBridge';
import { useGameStore } from '@/store/gameStore';
import toast from 'react-hot-toast';

/**
 * PhaserGame - React wrapper for Phaser 3 game
 * 
 * Responsibilities:
 * - Initialize Phaser game instance
 * - Bridge events between Phaser and React
 * - Sync game state to backend via Zustand
 * - Display React UI overlays
 */
export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { updateWellnessFromGame } = useGameStore();
  
  const [currentScene, setCurrentScene] = useState('Boot');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    console.log('[PhaserGame] Initializing Phaser 3 game...');

    // Create Phaser game instance
    const config: Phaser.Types.Core.GameConfig = {
      ...GAME_CONFIG,
      parent: containerRef.current,
      scene: [BootScene, MenuScene, WorldMapScene, CombatScene, CareQuestHubScene],
    };

    gameRef.current = new Phaser.Game(config);
    setIsLoading(false);

    // Set up event listeners
    const eventBridge = EventBridge.getInstance();

    // Scene changes
    eventBridge.on('game:sceneChanged', (data: { scene: string }) => {
      console.log('[PhaserGame] Scene changed:', data.scene);
      setCurrentScene(data.scene);
    });

    // Combat victory
    eventBridge.on('combat:victory', async (data: {
      rewards: {
        joy_delta?: number;
        care_delta?: number;
        harmony_delta?: number;
      };
      finalWPM: number;
      finalAccuracy: number;
      difficulty: number;
    }) => {
      console.log('[PhaserGame] Combat victory, syncing rewards:', data);
      
      toast.success(`Victory! WPM: ${data.finalWPM}, Accuracy: ${data.finalAccuracy}%`);
      
      try {
        await updateWellnessFromGame(data.rewards);
        toast.success(`Rewards synced: +${data.rewards.joy_delta} JOY, +${data.rewards.care_delta} CARE, +${data.rewards.harmony_delta} Harmony`);
      } catch (error) {
        console.error('[PhaserGame] Failed to sync rewards:', error);
        toast.error('Failed to sync rewards to backend');
      }
    });

    // NPC interactions
    eventBridge.on('npc:interact', (data: { key: string; dialogue: string }) => {
      console.log('[PhaserGame] NPC interaction:', data);
      // TODO: Open DialogueScene overlay or React modal
    });

    // Cleanup
    return () => {
      console.log('[PhaserGame] Cleaning up...');
      eventBridge.removeAllListeners();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [updateWellnessFromGame]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-4">Loading CareQuest...</div>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-full bg-blue-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Phaser canvas container - Contained with max dimensions */}
      <div
        ref={containerRef}
        id="phaser-game-container"
        className="w-full h-full max-w-[1920px] max-h-[1080px] rounded-lg overflow-hidden shadow-2xl border-2 border-gray-700 aspect-video"
      />

      {/* React UI overlays - Positioned inside game window */}
      <div className="absolute top-6 left-6 bg-black bg-opacity-70 text-white p-4 rounded-lg shadow-lg z-10">
        <div className="text-sm font-semibold mb-2">CareQuest Game Info</div>
        <div className="text-xs space-y-1">
          <p>
            <span className="text-gray-400">Scene:</span>{' '}
            <span className="text-blue-400">{currentScene}</span>
          </p>
          <p className="text-gray-400">
            {currentScene === 'WorldMap' && 'Arrow Keys: Move | Click: Interact'}
            {currentScene === 'Combat' && 'Type sentences | Backspace: Correct | ESC: Flee'}
            {currentScene === 'Boot' && 'Loading assets...'}
          </p>
        </div>
      </div>

      {/* Debug: Game status */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-6 right-6 bg-black bg-opacity-70 text-white p-3 rounded text-xs font-mono z-10">
          <div>Phaser {Phaser.VERSION}</div>
          <div>Scene: {currentScene}</div>
          <div>Resolution: 1920x1080</div>
          <div>FPS Target: 60</div>
        </div>
      )}
    </div>
  );
}
