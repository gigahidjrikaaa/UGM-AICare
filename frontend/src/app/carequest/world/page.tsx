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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-ugm-blue-dark to-ugm-blue flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-ugm-blue to-ugm-blue-dark border-b-2 border-ugm-gold/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
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
              <div className="flex items-center gap-2 px-4 py-2 bg-ugm-blue/80 border border-ugm-gold/30 rounded-lg shadow-lg">
                <Heart className="w-5 h-5 text-pink-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-300">JOY</span>
                  <span className="text-sm font-bold text-white">{joy}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-ugm-blue/80 border border-ugm-gold/30 rounded-lg shadow-lg">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-300">$CARE</span>
                  <span className="text-sm font-bold text-white">{care}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="flex-1 container mx-auto px-6 py-6 flex flex-col">
        {/* Game Window */}
        <div className="flex-1 bg-gray-900 rounded-xl shadow-2xl border-2 border-ugm-gold/40 overflow-hidden relative">
          <PhaserGame />
        </div>

        {/* Controls Info */}
        <div className="mt-4 bg-ugm-blue/90 border-2 border-ugm-gold/40 rounded-xl p-4 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-ugm-gold" />
              <h3 className="text-lg font-bold text-ugm-gold">Game Controls</h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-ugm-gold/20 rounded text-ugm-gold font-mono text-xs font-bold border border-ugm-gold/30">←↑↓→</kbd>
                <span>Move</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-ugm-gold/20 rounded text-ugm-gold font-mono text-xs font-bold border border-ugm-gold/30">SPACE</kbd>
                <span>Interact</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-ugm-gold/20 rounded text-ugm-gold font-mono text-xs font-bold border border-ugm-gold/30">ESC</kbd>
                <span>Menu</span>
              </div>
              <div className="text-xs text-white/60 ml-4">
                💡 Select your scene from the menu to begin!
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
