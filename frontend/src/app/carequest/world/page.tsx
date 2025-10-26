import { PhaserGame } from '@/components/game/PhaserGame';

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
  return (
    <div className="w-full h-screen overflow-hidden">
      <PhaserGame />
    </div>
  );
}
