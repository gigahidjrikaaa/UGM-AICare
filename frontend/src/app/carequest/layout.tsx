'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';

/**
 * CareQuest Layout
 * 
 * Shared layout for all CareQuest pages
 * - Navigation between Game/Guild/Market/Activities
 * - Wallet display ($CARE, JOY, Harmony)
 * - Responsive header
 */
export default function CareQuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { joy, care, harmony } = useGameStore();

  const navItems = [
    { href: '/carequest/world', label: 'Game', icon: '🎮' },
    { href: '/carequest/guild', label: 'Guild', icon: '👥' },
    { href: '/carequest/market', label: 'Market', icon: '🛒' },
    { href: '/carequest/activities', label: 'Activities', icon: '🎯' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Only show on non-game pages */}
      {pathname !== '/carequest/world' && (
        <header className="bg-white shadow-md sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/carequest/world" className="flex items-center space-x-2">
                <span className="text-2xl">🎮</span>
                <span className="text-2xl font-bold text-gray-900">CareQuest</span>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Wallet display */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-1 rounded-lg">
                  <span className="text-sm font-semibold text-yellow-800">
                    {joy} JOY
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-lg">
                  <span className="text-sm font-semibold text-green-800">
                    {care} $CARE
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-purple-100 px-3 py-1 rounded-lg">
                  <span className="text-sm font-semibold text-purple-800">
                    Rank {Math.floor(harmony / 100) + 1}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile navigation */}
            <nav className="md:hidden flex items-center justify-around mt-4 border-t pt-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg ${
                    isActive(item.href)
                      ? 'text-blue-500 font-semibold'
                      : 'text-gray-600'
                  }`}
                >
                  <span className="text-2xl mb-1">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={pathname === '/carequest/world' ? '' : 'py-6'}>
        {children}
      </main>
    </div>
  );
}
