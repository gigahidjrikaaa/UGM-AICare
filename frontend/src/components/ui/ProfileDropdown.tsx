"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import type { WellnessState } from "@/types/quests";
import { useTodayQuests } from "@/hooks/useQuests";
import { FiHelpCircle, FiLogOut, FiUser, FiZap } from "@/icons";
import QuestHud from "@/components/quests/QuestHud";

interface ProfileDropdownProps {
  isOpen: boolean;
  user: NonNullable<Session["user"]>;
  wellness?: WellnessState;
  onClose: () => void;
  onSignOut: () => void;
}

export default function ProfileDropdown({ isOpen, user, wellness, onClose, onSignOut }: ProfileDropdownProps) {
  const { data: quests } = useTodayQuests();
  const activeQuest = quests?.find((quest) => quest.status === "active");
  const questDisplayName =
    activeQuest?.template.name && activeQuest.template.name.length > 22
      ?  `${activeQuest.template.name.slice(0, 19)}…` 
      : activeQuest?.template.name;

  const quickTiles = [
    {
      href: "/quests",
      title: activeQuest ? "Continue Quest" : "Quest Board",
      icon: <FiZap className="h-4 w-4 text-[#FFCA40]" />,
      accent: "from-[#FFCA40]/18 via-[#FFCA40]/8 to-transparent",
    },
    {
      href: "/profile",
      title: "My Profile",
      icon: <FiUser className="h-4 w-4 text-sky-200" />,
      accent: "from-sky-500/15 via-sky-500/7 to-transparent",
    },
    {
      href: "/help",
      title: "Help Center",
      icon: <FiHelpCircle className="h-4 w-4 text-emerald-200" />,
      accent: "from-emerald-500/15 via-emerald-500/7 to-transparent",
    },
  ];

  const walletAddress = user.wallet_address?.trim() ?? "";
  const walletShort =
    walletAddress.length > 10 ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletAddress;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="profile-menu"
            initial={{ opacity: 0, y: -15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            transition={{
              duration: 0.25,
              ease: [0.25, 0.46, 0.45, 0.94],
              scale: { duration: 0.2 },
            }}
            className="absolute top-full left-1/2 mt-2 w-[min(40rem,96vw)] -translate-x-1/2 transform overflow-hidden rounded-3xl border border-white/10 bg-[#040F2A]/95 text-white shadow-[0_20px_40px_rgba(6,16,40,0.45)] backdrop-blur-3xl sm:left-auto sm:right-0 sm:mt-3 sm:w-[40rem] sm:translate-x-0 sm:transform-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
          >
            <div className="border-b border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-black/20">
                    <Image
                      src={user.image || "/default-avatar.png"}
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                      sizes="48px"
                      priority
                    />
                  </div>
                  <div className="flex-1 overflow-hidden text-sm">
                    <p className="truncate font-semibold text-white">{user.name}</p>
                    <p className="truncate text-[13px] text-white/70">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:items-end md:text-right">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-wide text-white/60">
                    <p className="text-[11px] font-semibold text-white/70">Web3 wallet</p>
                    {walletAddress ? (
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/80 md:justify-end">
                        <span className="font-mono text-white">{walletShort}</span>
                        <Link
                          href="/profile#wallet"
                          onClick={onClose}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
                        >
                          Manage
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
                        <span className="text-white/70">Link your Web3 wallet</span>
                        <Link
                          href="/profile#wallet"
                          onClick={onClose}
                          className="inline-flex items-center gap-2 rounded-full border border-[#FFCA40]/40 px-3 py-1.5 text-xs font-semibold text-[#FFCA40] transition hover:border-[#FFCA40]/70 hover:text-white"
                        >
                          Connect
                        </Link>
                      </div>
                    )}
                  </div>
                  <motion.button
                    onClick={onSignOut}
                    whileHover={{ backgroundColor: "rgba(248, 113, 113, 0.12)" }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/60 px-4 py-2 text-sm font-semibold text-red-200 transition-all duration-200 hover:border-red-300 hover:text-red-50"
                    role="menuitem"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Sign out
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4" role="none">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Harmony tracker</p>
                <div className="mt-3">
                  <QuestHud className="!mx-0 !mb-0 !mt-0 w-full" />
                </div>
                {wellness ? (
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-wide text-white/60">
                    <span>
                      Streak <span className="font-semibold text-white">{wellness.current_streak}</span> days
                    </span>
                    <span>
                      Longest <span className="font-semibold text-white">{wellness.longest_streak}</span> days
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {quickTiles.map((tile) => (
                  <motion.div key={tile.href}>
                    <Link
                      href={tile.href}
                      onClick={onClose}
                      className="group flex h-full flex-col justify-between rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 via-transparent to-transparent px-4 py-3 transition-all duration-200 hover:border-[#FFCA40]/35 hover:bg-[#FFCA40]/10"
                      role="menuitem"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tile.accent}`}>
                        {tile.icon}
                      </div>
                      <div className="mt-3 space-y-0.5 text-left">
                        <p className="text-sm font-semibold text-white">{tile.title}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}






