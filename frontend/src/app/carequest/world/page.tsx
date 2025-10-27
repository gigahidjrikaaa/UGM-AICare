'use client';

import { PhaserGame } from '@/components/game/PhaserGame';
import { useGameStore } from '@/store/gameStore';
import { ArrowLeft, Gamepad2, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * CareQuest World Page
 * 
 * Main Phaser 3 game route - Full RPG experience
 * - UGM campus exploration
 * - Typing combat
 * - NPC interactions
 * - Quest progression
 */
export default function CareQuestWorldPage() {
  const { joy, care } = useGameStore();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-ugm-blue to-ugm-blue-dark">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <Link 
              href="/carequest"
              className="flex items-center gap-2 text-ugm-gold hover:text-ugm-gold/80 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back to CareQuest</span>
            </Link>

            {/* Title */}
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-6 h-6 text-ugm-gold" />
              <h1 className="text-2xl font-bold text-white">CareQuest World</h1>
            </div>

            {/* Resource Display */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-ugm-blue/80 border border-ugm-gold/30 rounded-lg">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-white">{joy}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-ugm-blue/80 border border-ugm-gold/30 rounded-lg">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">{care}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Panel (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 max-w-md">
        <div className="bg-ugm-blue/90 border-2 border-ugm-gold/40 rounded-xl p-4 backdrop-blur-md shadow-2xl">
          <h3 className="text-lg font-bold text-ugm-gold mb-2 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Game Controls
          </h3>
          <div className="space-y-1 text-sm text-white/90">
            <p><kbd className="px-2 py-0.5 bg-ugm-gold/20 rounded text-ugm-gold font-mono text-xs">←↑↓→</kbd> Move around</p>
            <p><kbd className="px-2 py-0.5 bg-ugm-gold/20 rounded text-ugm-gold font-mono text-xs">SPACE</kbd> Interact with NPCs</p>
            <p><kbd className="px-2 py-0.5 bg-ugm-gold/20 rounded text-ugm-gold font-mono text-xs">ESC</kbd> Return to menu</p>
            <p className="text-xs text-white/60 mt-2">Select your scene from the menu to begin!</p>
          </div>
        </div>
      </div>

      {/* Phaser Game Canvas */}
      <PhaserGame />
    </div>
  );
}
