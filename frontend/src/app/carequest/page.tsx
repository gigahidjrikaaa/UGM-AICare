'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { StatBar } from '@/components/carequest/StatBar';
import { QuestCard } from '@/components/carequest/QuestCard';
import { ProgressRing } from '@/components/carequest/ProgressRing';
import { Sword, Map, Users, ShoppingBag, Zap, Trophy, Star, Home, ArrowLeft, Sparkles, Shield } from 'lucide-react';

/**
 * CareQuest Landing Page - Redesigned with Flashy RPG Game Elements
 * 
 * Features:
 * - Epic game-themed header with animations
 * - RPG-style hero with animated stats
 * - Quest preview cards
 * - NFT Achievement showcase (EDU Chain / ERC-1155)
 * - Game-style navigation
 * - Back to main site button
 * 
 * NFT Badges are minted via UGMJournalBadges.sol contract on EDU Chain
 * Metadata: blockchain/metadata/*.json
 * Assets: public/nft-asset/*.jpeg
 */
export default function CareQuestPage() {
  const { joy, care, harmony } = useGameStore();

  // Calculate player level from harmony
  const playerLevel = Math.floor(harmony / 100) + 1;
  const levelProgress = (harmony % 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-ugm-blue via-ugm-blue-dark to-black relative overflow-hidden">
      {/* Epic Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-20 -left-40 w-96 h-96 bg-ugm-gold/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 -right-40 w-96 h-96 bg-aurora-purple/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
        
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-ugm-gold rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                opacity: [0.2, 1, 0.2],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* Floating stars */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              rotate: 360,
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            <Sparkles className="w-4 h-4 text-ugm-gold/60" />
          </motion.div>
        ))}
      </div>

      {/* Back to Main Site Button - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed top-6 left-6 z-50"
      >
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-ugm-blue to-ugm-blue-dark backdrop-blur-xl border-2 border-ugm-gold/50 rounded-xl shadow-2xl shadow-ugm-gold/20 hover:shadow-ugm-gold/40 transition-all"
          >
            <motion.div
              animate={{ x: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowLeft className="w-5 h-5 text-ugm-gold" />
            </motion.div>
            <div className="text-left">
              <div className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">Back to</div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                <Home className="w-4 h-4 text-ugm-gold" />
                UGM-AICare
              </div>
            </div>
          </motion.button>
        </Link>
      </motion.div>

      {/* Epic Game Header */}
      <section className="container mx-auto px-6 pt-24 pb-12 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          >
            {/* Epic Title with Multiple Effects */}
            <div className="relative inline-block mb-8">
              {/* Glowing background */}
              <motion.div
                className="absolute -inset-8 bg-gradient-to-r from-ugm-gold/30 via-yellow-300/30 to-ugm-gold/30 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                  opacity: [0.4, 0.7, 0.4] 
                }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              
              {/* Main title */}
              <h1 className="relative text-8xl md:text-9xl font-black mb-4">
                <span className="relative inline-block">
                  <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-ugm-gold to-yellow-200 blur-sm">
                    CareQuest
                  </span>
                  <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-ugm-gold via-yellow-300 to-ugm-gold">
                    CareQuest
                  </span>
                </span>
              </h1>

              {/* Decorative swords */}
              <div className="absolute -left-24 top-1/2 -translate-y-1/2 hidden lg:block">
                <motion.div
                  animate={{ rotate: [0, 10, 0], y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Sword className="w-16 h-16 text-ugm-gold drop-shadow-2xl" />
                </motion.div>
              </div>
              <div className="absolute -right-24 top-1/2 -translate-y-1/2 hidden lg:block">
                <motion.div
                  animate={{ rotate: [0, -10, 0], y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                >
                  <Shield className="w-16 h-16 text-aurora-purple drop-shadow-2xl" />
                </motion.div>
              </div>
            </div>

            {/* Subtitle with typewriter effect feel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              <p className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-white to-gray-200 mb-4">
                Your Epic Mental Health Journey
              </p>
              <p className="text-xl text-gray-300 mb-6">
                🏛️ Embark on therapeutic quests across UGM Campus 🏛️
              </p>
            </motion.div>

            {/* Hero Character Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 100 }}
              className="relative mx-auto w-64 h-64 md:w-80 md:h-80 mb-8"
            >
              {/* Glowing orb background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-ugm-gold/40 via-yellow-300/40 to-aurora-purple/40 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 180, 360],
                  opacity: [0.4, 0.7, 0.4] 
                }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              
              {/* Placeholder character illustration - Using logo as hero */}
              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-ugm-gold shadow-2xl shadow-ugm-gold/50">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ugm-blue-dark/90 to-black/90"
                >
                  <Image
                    src="/carequest-logo.png"
                    alt="CareQuest Hero Character"
                    width={200}
                    height={200}
                    className="object-contain drop-shadow-2xl"
                    priority
                  />
                </motion.div>
              </div>

              {/* Floating sparkles around hero */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`hero-sparkle-${i}`}
                  className="absolute"
                  style={{
                    left: `${50 + 45 * Math.cos((i / 8) * 2 * Math.PI)}%`,
                    top: `${50 + 45 * Math.sin((i / 8) * 2 * Math.PI)}%`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                >
                  <Star className="w-4 h-4 text-ugm-gold fill-ugm-gold" />
                </motion.div>
              ))}
            </motion.div>

            {/* Player Level Badge - More Flashy */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-ugm-gold/20 via-yellow-400/20 to-ugm-gold/20 backdrop-blur-xl border-2 border-ugm-gold rounded-full shadow-2xl shadow-ugm-gold/30"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Zap className="w-6 h-6 text-ugm-gold fill-ugm-gold" />
              </motion.div>
              <span className="text-2xl font-black text-ugm-gold">
                Level {playerLevel}
              </span>
              <span className="text-lg font-bold text-white">Adventurer</span>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Trophy className="w-6 h-6 text-ugm-gold fill-ugm-gold" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Epic Call-to-Action Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, type: 'spring', stiffness: 150 }}
            className="mt-12"
          >
            <Link
              href="/carequest/world"
              className="group relative inline-block"
            >
              <motion.div
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                {/* Pulsing glow effect */}
                <motion.div
                  className="absolute -inset-4 bg-gradient-to-r from-ugm-gold via-yellow-400 to-ugm-gold rounded-2xl blur-xl opacity-60"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.6, 0.8, 0.6],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Button */}
                <div className="relative px-16 py-6 bg-gradient-to-r from-ugm-gold via-yellow-400 to-ugm-gold text-ugm-blue-dark text-3xl font-black rounded-2xl shadow-2xl overflow-hidden border-4 border-yellow-200">
                  {/* Animated shine */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ['-200%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 0.5 }}
                  />
                  
                  {/* Sparkles */}
                  <motion.div
                    className="absolute top-2 left-8"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      rotate: [0, 180, 360],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Star className="w-6 h-6 text-yellow-200 fill-yellow-200" />
                  </motion.div>
                  <motion.div
                    className="absolute bottom-2 right-8"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      rotate: [360, 180, 0],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <Star className="w-6 h-6 text-yellow-200 fill-yellow-200" />
                  </motion.div>
                  
                  <span className="relative z-10 flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Sword className="w-8 h-8" />
                    </motion.div>
                    BEGIN YOUR QUEST
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Zap className="w-8 h-8 fill-current" />
                    </motion.div>
                  </span>
                </div>
              </motion.div>
            </Link>
            
            {/* Tutorial hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-sm text-gray-400 mt-4"
            >
              ✨ Complete quests • Earn XP • Level up your mental wellness ✨
            </motion.p>
          </motion.div>
        </div>

        {/* Enhanced Player Stats Dashboard */}
        {(joy > 0 || care > 0 || harmony > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, type: 'spring' }}
            className="max-w-6xl mx-auto mb-16"
          >
            <div className="relative">
              {/* Glow effect behind card */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-ugm-gold/30 via-aurora-purple/30 to-aurora-cyan/30 rounded-3xl blur-2xl"
                animate={{ 
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              
              <div className="relative bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl rounded-3xl border-2 border-white/30 p-10 shadow-2xl">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-6">
                  <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 2 }}
                  >
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-ugm-gold to-yellow-300 flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        <Trophy className="w-9 h-9 text-ugm-gold fill-ugm-gold drop-shadow-lg" />
                      </motion.div>
                      YOUR ADVENTURE STATS
                    </h3>
                    <p className="text-gray-300 mt-1 ml-12">Track your mental wellness journey</p>
                  </motion.div>
                  
                  {/* Enhanced Level ring */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 2.2, type: 'spring', stiffness: 200 }}
                    className="relative"
                  >
                    <motion.div
                      className="absolute -inset-3 bg-ugm-gold/30 rounded-full blur-xl"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <ProgressRing
                      progress={levelProgress}
                      size={100}
                      strokeWidth={8}
                      color="gold"
                      showPercentage={false}
                    >
                      <div className="text-center">
                        <div className="text-3xl font-black text-ugm-gold drop-shadow-lg">{playerLevel}</div>
                        <div className="text-xs text-gray-300 font-bold">LEVEL</div>
                      </div>
                    </ProgressRing>
                  </motion.div>
                </div>

                {/* Enhanced stat bars with stagger animation */}
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { label: 'JOY', value: joy, max: 1000, icon: 'joy', color: 'pink', delay: 2.4 },
                    { label: 'CARE', value: care, max: 10000, icon: 'care', color: 'cyan', delay: 2.6 },
                    { label: 'Harmony', value: harmony % 100, max: 100, icon: 'harmony', color: 'purple', delay: 2.8 },
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: stat.delay }}
                    >
                      <StatBar
                        label={stat.label}
                        value={stat.value}
                        maxValue={stat.max}
                        icon={stat.icon as 'joy' | 'care' | 'harmony'}
                        color={stat.color as 'pink' | 'cyan' | 'purple'}
                        size="lg"
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Progress indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3 }}
                  className="mt-6 pt-6 border-t border-white/20 flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4 text-ugm-gold" />
                  <span className="text-gray-300">
                    <span className="text-ugm-gold font-bold">{levelProgress}%</span> to Level {playerLevel + 1}
                  </span>
                  <Sparkles className="w-4 h-4 text-ugm-gold" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Enhanced Quick Access Navigation - Epic Game Style */}
      <section className="container mx-auto px-6 mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section Title */}
          <div className="text-center mb-12">
            <motion.h2 
              className="text-5xl md:text-6xl font-black mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-white">
                Explore the{' '}
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ugm-gold via-yellow-300 to-ugm-gold">
                CareQuest World
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-300"
            >
              🗺️ Choose your path to mental wellness 🗺️
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Navigation Cards */}
            {[
              {
                title: 'Quest Map',
                description: 'Explore UGM campus and complete therapeutic quests',
                icon: Map,
                href: '/carequest/world',
                color: 'from-aurora-blue to-blue-600',
                glow: 'shadow-aurora-blue/50',
              },
              {
                title: 'Activities',
                description: 'Mini-games and mindfulness exercises',
                icon: Zap,
                href: '/carequest/activities',
                color: 'from-aurora-purple to-purple-600',
                glow: 'shadow-aurora-purple/50',
              },
              {
                title: 'Guild',
                description: 'Join study groups and support communities',
                icon: Users,
                href: '/carequest/guild',
                color: 'from-aurora-cyan to-cyan-600',
                glow: 'shadow-aurora-cyan/50',
              },
              {
                title: 'Market',
                description: 'Spend $CARE on rewards and power-ups',
                icon: ShoppingBag,
                href: '/carequest/market',
                color: 'from-ugm-gold to-yellow-600',
                glow: 'shadow-ugm-gold/50',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative overflow-hidden rounded-xl border-2 border-white/30 bg-gradient-to-br from-ugm-blue/80 to-ugm-blue-dark/80 backdrop-blur-sm p-6 cursor-pointer ${item.glow} shadow-xl hover:shadow-2xl transition-shadow group`}
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />

                    {/* Decorative background icon */}
                    <motion.div
                      className={`absolute -right-8 -bottom-8 opacity-10 group-hover:opacity-20 transition-opacity`}
                      whileHover={{ rotate: 15, scale: 1.2 }}
                    >
                      <item.icon className="w-32 h-32 text-white" />
                    </motion.div>

                    {/* Floating particles on hover */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={`particle-${item.title}-${i}`}
                          className="absolute w-1 h-1 bg-white rounded-full"
                          style={{
                            left: `${20 + i * 15}%`,
                            bottom: '10%',
                          }}
                          animate={{
                            y: [0, -60, -80],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <motion.div
                        className={`inline-block p-4 rounded-xl bg-gradient-to-br ${item.color} mb-4 shadow-lg`}
                        whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <item.icon className="w-8 h-8 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-ugm-gold transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                        {item.description}
                      </p>

                      {/* "Enter" indicator on hover */}
                      <motion.div
                        className="mt-4 flex items-center gap-2 text-xs font-semibold text-ugm-gold opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={{ x: -10 }}
                        whileHover={{ x: 0 }}
                      >
                        <span>ENTER</span>
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          →
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Featured Quests Preview */}
      <section className="container mx-auto px-6 mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            Featured <span className="text-ugm-gold">Quests</span>
          </h2>
          <p className="text-center text-gray-300 mb-8 max-w-2xl mx-auto">
            Practice real therapeutic skills through typing combat and mindfulness exercises
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <QuestCard
              title="Morning Affirmations"
              description="Start your day by typing 5 positive affirmations to boost your JOY."
              xpReward={50}
              progress={75}
              difficulty="easy"
              category="Daily"
              onClick={() => {}}
            />
            <QuestCard
              title="Defeat Stress Monster"
              description="Type CBT reframes to combat stress and anxiety in a timed challenge."
              xpReward={150}
              progress={0}
              difficulty="medium"
              category="Combat"
              onClick={() => {}}
            />
            <QuestCard
              title="Gratitude Journal"
              description="Write down three things you're grateful for today."
              xpReward={100}
              progress={100}
              difficulty="easy"
              category="Wellness"
              completed
              onClick={() => {}}
            />
          </div>
        </motion.div>
      </section>

      {/* Achievement Showcase - NFT Badges from EDU Chain */}
      <section className="container mx-auto px-6 mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <motion.h2 
              className="text-5xl md:text-6xl font-black mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-white">
                Unlock{' '}
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ugm-gold via-yellow-300 to-ugm-gold">
                NFT Achievements
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-300 mb-2"
            >
              🏆 Earn blockchain-verified badges on EDU Chain 🏆
            </motion.p>
            <p className="text-sm text-gray-400">
              Complete quests and milestones to unlock exclusive NFT badges
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                tokenId: 1,
                image: '/nft-asset/let_there_be_badge.jpeg',
                title: 'Let There Be Badge',
                description: 'First journal entry or chat',
                rarity: 'Common',
                color: 'from-gray-400 to-gray-600',
                unlocked: true,
              },
              {
                tokenId: 2,
                image: '/nft-asset/triple_threat_of_thoughts.jpeg',
                title: 'Triple Threat of Thoughts',
                description: '3 days of activity',
                rarity: 'Uncommon',
                color: 'from-green-500 to-emerald-500',
                unlocked: true,
              },
              {
                tokenId: 3,
                image: '/nft-asset/seven_days_a_week.jpeg',
                title: 'Seven Days a Week',
                description: '7 consecutive days streak',
                rarity: 'Rare',
                color: 'from-blue-500 to-cyan-500',
                unlocked: true,
              },
              {
                tokenId: 4,
                image: '/nft-asset/two_weeks_notice_you_gave_to_negativity.jpeg',
                title: 'Two Weeks Notice',
                description: '14-day activity streak',
                rarity: 'Epic',
                color: 'from-purple-500 to-pink-500',
                unlocked: false,
              },
              {
                tokenId: 5,
                image: '/nft-asset/full_moon_positivity.jpeg',
                title: 'Full Moon Positivity',
                description: '30 days of wellness',
                rarity: 'Legendary',
                color: 'from-yellow-500 to-orange-500',
                unlocked: false,
              },
              {
                tokenId: 6,
                image: '/nft-asset/quarter_century_of_journaling.jpeg',
                title: 'Quarter Century',
                description: '25 journal entries',
                rarity: 'Legendary',
                color: 'from-ugm-gold to-yellow-400',
                unlocked: false,
              },
              {
                tokenId: 7,
                image: '/nft-asset/unleash_the_words.jpeg',
                title: 'Unleash the Words',
                description: 'Complete journal milestone',
                rarity: 'Rare',
                color: 'from-indigo-500 to-purple-500',
                unlocked: false,
              },
              {
                tokenId: 8,
                image: '/nft-asset/besties.jpeg',
                title: 'Besties',
                description: 'Join a support guild',
                rarity: 'Rare',
                color: 'from-pink-500 to-rose-500',
                unlocked: false,
              },
            ].map((badge, index) => (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="group relative"
              >
                {/* Glow effect */}
                <motion.div
                  className={`absolute -inset-1 bg-gradient-to-r ${badge.color} rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300`}
                  animate={{
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.5,
                  }}
                />

                {/* Badge Card */}
                <div className="relative bg-gradient-to-br from-ugm-blue/90 to-ugm-blue-dark/90 backdrop-blur-sm rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl group-hover:shadow-2xl group-hover:border-white/40 transition-all">
                  {/* NFT Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={badge.image}
                      alt={badge.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    
                    {/* Rarity badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 bg-gradient-to-r ${badge.color} rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm`}>
                      {badge.rarity}
                    </div>

                    {/* Token ID badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-mono text-gray-300 border border-white/20">
                      #{badge.tokenId}
                    </div>

                    {/* Locked overlay */}
                    {!badge.unlocked && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 0.9 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
                      >
                        <div className="text-center">
                          <motion.div
                            animate={{ rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            🔒
                          </motion.div>
                          <p className="text-white text-sm font-semibold mt-2">Locked</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Badge Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-ugm-gold transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {badge.description}
                    </p>

                    {/* Blockchain indicator */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-ugm-gold">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        >
                          ⛓️
                        </motion.div>
                        <span className="font-semibold">EDU Chain</span>
                      </div>
                      {badge.unlocked && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <span>✓</span>
                          <span className="font-semibold">Earned</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="text-center mt-12"
          >
            <Link href="/carequest/activities">
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 bg-gradient-to-r from-ugm-gold to-yellow-400 text-ugm-blue-dark font-bold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-ugm-gold/50 transition-all overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Start Earning Badges
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    →
                  </motion.div>
                </span>
              </motion.button>
            </Link>
            <p className="text-sm text-gray-400 mt-4">
              All badges are minted as NFTs on EDU Chain • Fully owned by you • Tradeable
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
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
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-aurora-blue to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Practice Skills</h3>
                <p className="text-gray-300 text-sm">
                  Type therapeutic sentences with accuracy to defeat anxiety monsters
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-aurora-purple to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Earn Rewards</h3>
                <p className="text-gray-300 text-sm">
                  Collect JOY and $CARE tokens to level up and unlock new features
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-ugm-gold to-yellow-600 flex items-center justify-center text-2xl font-bold text-white">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Real Benefits</h3>
                <p className="text-gray-300 text-sm">
                  Spend $CARE on real-world rewards at UGM campus locations
                </p>
              </div>
            </div>

            <div className="bg-aurora-blue/10 border border-aurora-blue/30 rounded-xl p-6">
              <h4 className="text-lg font-bold text-aurora-blue mb-3">Why Gamification Works</h4>
              <p className="text-gray-300 leading-relaxed">
                Research shows that gamification increases engagement with mental health interventions by 40-60%. 
                By making therapeutic practice <span className="font-semibold text-white">fun and rewarding</span>, 
                students are more likely to build consistent habits that improve wellbeing.
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
            Practice mental health skills, defeat anxiety monsters, and earn real rewards
          </p>
          
          <Link href="/carequest/world">
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
