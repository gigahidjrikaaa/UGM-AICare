'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { StatBar } from '@/components/carequest/StatBar';
import { ProgressRing } from '@/components/carequest/ProgressRing';
import { Sword, Zap, Trophy, Star, Shield } from 'lucide-react';
import ParticleBackground from '@/components/ui/ParticleBackground';

/**
 * CareQuest Hub — the landing for the therapeutic mini-game.
 *
 * Deliberately honest: it only describes what the game actually does today
 * (therapeutic typing quests synced with the wellness engine and
 * wallet-minted achievement badges). No marketplace, guild, or token
 * redemption is promised because those don't exist.
 */
export default function CareQuestPage() {
  const { joy, harmony } = useGameStore();

  // Calculate player level from harmony
  const playerLevel = Math.floor(harmony / 100) + 1;
  const levelProgress = harmony % 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001D58] via-[#00308F] to-[#002A7A] relative overflow-hidden">
      {/* ParticleBackground for consistency with main site */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <ParticleBackground count={50} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={0.8} />
      </div>

      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden py-12 pb-0">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#001D58]/20 via-[#00308F]/10 to-transparent" />
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-7xl mx-auto">
            {/* Left Column - Text Content */}
            <div className="text-left space-y-6">
              <div className="relative">
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-none mb-3">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFCA40] via-[#FFD700] to-[#FFCA40]">
                    CareQuest
                  </span>
                </h1>

                <p className="text-xl md:text-2xl font-bold text-white mb-2">
                  Your Mental Health Journey
                </p>
                <p className="text-base md:text-lg text-gray-300">
                  🏛️ Practice therapeutic skills through quests set across UGM Campus
                </p>
              </div>

              {/* Inline Level Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FFCA40]/20 to-[#FFD700]/20 backdrop-blur-md border border-[#FFCA40]/50 rounded-full">
                <Zap className="w-5 h-5 text-[#FFCA40] fill-[#FFCA40]" />
                <span className="text-lg font-black text-[#FFCA40]">
                  Level {playerLevel}
                </span>
                <span className="text-sm font-bold text-white">Adventurer</span>
                <Trophy className="w-5 h-5 text-[#FFCA40] fill-[#FFCA40]" />
              </div>

              {/* CTA Button */}
              <div>
                <Link href="/carequest/game" className="group inline-block">
                  <div className="relative px-10 py-4 bg-gradient-to-r from-[#FFCA40] via-[#FFD700] to-[#FFCA40] text-[#001D58] text-xl md:text-2xl font-black rounded-xl shadow-xl border-2 border-[#FFE680] hover:shadow-2xl hover:scale-105 transition-all duration-200">
                    <span className="flex items-center gap-3">
                      <Sword className="w-6 h-6" />
                      PLAY CAREQUEST
                      <Zap className="w-6 h-6 fill-current" />
                    </span>
                  </div>
                </Link>

                <p className="text-sm text-gray-400 mt-3">
                  ✨ Complete quests • Earn XP • Level up your mental wellness
                </p>
              </div>
            </div>

            {/* Right Column - Hero Character */}
            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="relative w-72 h-72 md:w-96 md:h-96 lg:w-[450px] lg:h-[450px]">
                <div className="absolute inset-0 bg-gradient-to-r from-[#FFCA40]/30 via-[#FFD700]/30 to-[#B8A4FF]/30 rounded-full blur-3xl opacity-60" />

                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#FFCA40]/70 shadow-2xl">
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#001D58]/90 to-black/90">
                    <Image
                      src="/carequest-logo.png"
                      alt="CareQuest Hero"
                      width={250}
                      height={250}
                      className="object-contain drop-shadow-2xl"
                      priority
                    />
                  </div>
                </div>

                <div className="absolute -left-12 top-1/4 hidden lg:block opacity-70">
                  <Sword className="w-16 h-16 text-[#FFCA40] drop-shadow-xl" />
                </div>
                <div className="absolute -right-12 bottom-1/4 hidden lg:block opacity-70">
                  <Shield className="w-16 h-16 text-[#B8A4FF] drop-shadow-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Stats Dashboard — synced from the quest wellness engine */}
      {(joy > 0 || harmony > 0) && (
        <section className="container mx-auto px-6 pb-12 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFCA40] to-[#FFD700] flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFCA40] fill-[#FFCA40]" />
                  Your Progress
                </h3>

                <div className="relative">
                  <ProgressRing
                    progress={levelProgress}
                    size={50}
                    strokeWidth={5}
                    color="gold"
                    showPercentage={false}
                  >
                    <div className="text-center">
                      <div className="text-base font-black text-[#FFCA40]">{playerLevel}</div>
                    </div>
                  </ProgressRing>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'JOY', value: joy, max: 1000, icon: 'joy', color: 'pink' },
                  { label: 'Harmony', value: harmony % 100, max: 100, icon: 'harmony', color: 'purple' },
                ].map((stat) => (
                  <StatBar
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    maxValue={stat.max}
                    icon={stat.icon as 'joy' | 'harmony'}
                    color={stat.color as 'pink' | 'purple'}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works — honest version */}
      <section className="container mx-auto px-6 mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border-2 border-white/20 p-8 shadow-2xl">
            <h2 className="text-4xl font-bold text-white text-center mb-8">
              How <span className="text-ugm-gold">CareQuest</span> Works
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#6A98F0] to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Practice Skills</h3>
                <p className="text-gray-300 text-sm">
                  Type therapeutic sentences with accuracy to defeat anxiety monsters
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#B8A4FF] to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sync Your Progress</h3>
                <p className="text-gray-300 text-sm">
                  XP, JOY, and Harmony sync with your UGM-AICare wellness state across the app
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-ugm-gold to-yellow-600 flex items-center justify-center text-2xl font-bold text-white">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Earn Badges</h3>
                <p className="text-gray-300 text-sm">
                  Milestone badges are recorded on-chain when you link your Open Campus ID wallet
                </p>
              </div>
            </div>

            <div className="bg-[#6A98F0]/10 border border-[#6A98F0]/30 rounded-xl p-6">
              <h4 className="text-lg font-bold text-[#8FB6F5] mb-3">Why Gamification Works</h4>
              <p className="text-gray-300 leading-relaxed">
                Making therapeutic practice <span className="font-semibold text-white">fun and rewarding</span> helps
                students build consistent habits. CareQuest is one piece of UGM-AICare — the AI companion,
                journaling tools, and campus counselor appointments are always available in the main app.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-6 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-5xl font-bold text-white mb-4">
            Ready to Begin Your <span className="text-ugm-gold">Adventure</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Practice mental health skills and build habits, one quest at a time
          </p>

          <Link href="/carequest/game">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block px-16 py-6 bg-gradient-to-r from-ugm-gold to-yellow-500 text-ugm-blue-dark text-2xl font-black rounded-xl shadow-2xl shadow-ugm-gold/50"
            >
              <span className="flex items-center gap-3">
                <Sword className="w-8 h-8" />
                Start Your Quest
                <Star className="w-8 h-8 fill-current" />
              </span>
            </motion.div>
          </Link>

          <p className="text-sm text-gray-400 mt-6">
            Part of the UGM-AICare mental health ecosystem
          </p>
        </motion.div>
      </section>
    </div>
  );
}
