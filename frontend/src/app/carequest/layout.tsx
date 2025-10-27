'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Home, Sword, Users, ShoppingBag, Activity, Sparkles } from 'lucide-react';

/**
 * CareQuest Layout - Redesigned with UGM Design System
 * 
 * Features:
 * - UGM color palette (Blue #001D58, Gold #FFCA40)
 * - CareQuest logo integration
 * - Animated header with particle effects
 * - RPG-style resource display
 * - Glassmorphism effects
 * - Responsive mobile navigation
 */
export default function CareQuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { joy, care, harmony } = useGameStore();

  const navItems = [
    { href: '/carequest', label: 'Home', icon: Home, color: 'from-ugm-blue to-ugm-blue-dark' },
    { href: '/carequest/world', label: 'Game', icon: Sword, color: 'from-ugm-gold to-yellow-500' },
    { href: '/carequest/guild', label: 'Guild', icon: Users, color: 'from-aurora-purple to-purple-600' },
    { href: '/carequest/market', label: 'Market', icon: ShoppingBag, color: 'from-green-500 to-emerald-600' },
    { href: '/carequest/activities', label: 'Activities', icon: Activity, color: 'from-pink-500 to-rose-600' },
  ];

  const isActive = (href: string) => pathname === href;

  // Calculate player level
  const playerLevel = Math.floor(harmony / 100) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ugm-blue via-ugm-blue-dark to-black relative">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-20 -left-40 w-96 h-96 bg-ugm-gold/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 -right-40 w-96 h-96 bg-aurora-purple/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
      </div>

      {/* Header - Only show on non-world pages */}
      {pathname !== '/carequest/world' && (
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100 }}
          className="sticky top-0 z-50 backdrop-blur-xl bg-ugm-blue/80 border-b-2 border-ugm-gold/30 shadow-2xl"
        >
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo with Animation */}
              <Link href="/carequest" className="flex items-center space-x-3 group">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-ugm-gold/50"
                >
                  <Image
                    src="/carequest-logo.png"
                    alt="CareQuest Logo"
                    fill
                    className="object-contain"
                  />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-ugm-gold via-yellow-300 to-ugm-gold group-hover:animate-pulse">
                    CareQuest
                  </h1>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                    Mental Health Adventure
                  </p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative group px-4 py-2 rounded-xl transition-all ${
                          active
                            ? 'bg-gradient-to-r ' + item.color + ' shadow-lg'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-300'}`} />
                          <span className={`font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>
                            {item.label}
                          </span>
                        </div>
                        {active && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-white/10 rounded-xl"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* Resource Display - RPG Style */}
              <div className="hidden md:flex items-center gap-3">
                {/* JOY */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl blur-md group-hover:blur-lg transition-all" />
                  <div className="relative flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-yellow-400/30">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="font-bold text-yellow-100">{joy.toFixed(0)}</span>
                    <span className="text-xs text-yellow-300/80">JOY</span>
                  </div>
                </motion.div>

                {/* CARE */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-xl blur-md group-hover:blur-lg transition-all" />
                  <div className="relative flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-green-400/30">
                    <span className="text-lg">💎</span>
                    <span className="font-bold text-green-100">{care.toFixed(0)}</span>
                    <span className="text-xs text-green-300/80">CARE</span>
                  </div>
                </motion.div>

                {/* Harmony Level */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-aurora-purple/20 to-purple-400/20 rounded-xl blur-md group-hover:blur-lg transition-all" />
                  <div className="relative flex items-center gap-2 bg-gradient-to-r from-aurora-purple/20 to-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-purple-400/30">
                    <span className="text-lg">⭐</span>
                    <span className="font-bold text-purple-100">Lv.{playerLevel}</span>
                    <span className="text-xs text-purple-300/80">Harmony</span>
                  </div>
                </motion.div>

                {/* Back to Main Site */}
                <Link href="/">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 bg-ugm-blue-dark/50 backdrop-blur-sm rounded-xl border border-ugm-gold/30 hover:border-ugm-gold transition-all"
                  >
                    <Home className="w-4 h-4 text-ugm-gold" />
                    <span className="text-sm font-semibold text-white">UGM-AICare</span>
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="lg:hidden flex items-center justify-around mt-4 pt-4 border-t border-white/10">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                        active ? 'bg-white/10' : ''
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-ugm-gold' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Resources */}
            <div className="md:hidden flex items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-lg border border-yellow-400/30">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span className="text-xs font-bold text-yellow-100">{joy.toFixed(0)}</span>
              </div>
              <div className="flex items-center gap-1 bg-green-500/20 px-3 py-1 rounded-lg border border-green-400/30">
                <span className="text-sm">💎</span>
                <span className="text-xs font-bold text-green-100">{care.toFixed(0)}</span>
              </div>
              <div className="flex items-center gap-1 bg-purple-500/20 px-3 py-1 rounded-lg border border-purple-400/30">
                <span className="text-sm">⭐</span>
                <span className="text-xs font-bold text-purple-100">Lv.{playerLevel}</span>
              </div>
            </div>
          </div>
        </motion.header>
      )}

      {/* Main content */}
      <main className={`relative z-10 ${pathname === '/carequest/world' ? '' : 'py-6'}`}>
        {children}
      </main>
    </div>
  );
}
