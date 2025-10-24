"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import type { WellnessState } from "@/types/quests";
import { useTodayQuests } from "@/hooks/useQuests";
import { FiActivity, FiHelpCircle, FiLogOut, FiPieChart, FiUser, FiZap } from "@/icons";

interface ProfileDropdownProps {
  isOpen: boolean;
  user: NonNullable<Session["user"]>;
  wellness?: WellnessState;
  onClose: () => void;
  onSignOut: () => void;
}

const formatMetric = (value: number | null | undefined, digits: number) =>
  (typeof value === "number" ? value : 0).toFixed(digits);

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
      subtitle: activeQuest ? questDisplayName ?? "Daily quest" : "View daily lineup",
      icon: <FiZap className="h-4 w-4 text-[#FFCA40]" />,
      accent: "from-[#FFCA40]/18 via-[#FFCA40]/8 to-transparent",
    },
    {
      href: "/profile",
      title: "My Profile",
      subtitle: "Personal details & prefs",
      icon: <FiUser className="h-4 w-4 text-sky-200" />,
      accent: "from-sky-500/15 via-sky-500/7 to-transparent",
    },
    {
      href: "/help",
      title: "Help Center",
      subtitle: "Guides & support desk",
      icon: <FiHelpCircle className="h-4 w-4 text-emerald-200" />,
      accent: "from-emerald-500/15 via-emerald-500/7 to-transparent",
    },
  ];

  const metrics = wellness
    ? [
        {
          label: "Harmony",
          value: formatMetric(wellness.harmony_score, 1),
          caption: "Balance index",
          accent: "from-sky-500/20 via-sky-500/10 to-transparent",
          icon: <FiPieChart className="h-4 w-4 text-sky-300" />,
          description:
            "Harmony: keseimbangan emosional dan kemajuan harianmu. Bertambah ketika menjaga streak dan menyelesaikan quest.",
        },
        {
          label: "JOY",
          value: formatMetric(wellness.joy_balance, 0),
          caption: "Energy points",
          accent: "from-amber-400/25 via-amber-400/10 to-transparent",
          icon: (
            <svg
              className="h-4 w-4 text-amber-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 21c4.8 0 9-3.5 9-9s-4.2-9-9-9-9 3.5-9 9 4.2 9 9 9Z" />
              <path d="M9 10h.01M15 10h.01" strokeLinecap="round" />
              <path d="M8.5 15s1.5 2 3.5 2 3.5-2 3.5-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          description: "JOY: energi positif untukmu dan guild. Dikumpulkan dari quest dan aktivitas penuh semangat.",
        },
        {
          label: "CARE",
          value: formatMetric(wellness.care_balance, 2),
          caption: "Support reserve",
          accent: "from-emerald-400/25 via-emerald-400/10 to-transparent",
          icon: <FiActivity className="h-4 w-4 text-emerald-300" />,
          description:
            "CARE: tabungan dukungan yang bisa dipakai saat Compassion Mode atau event kolaboratif.",
        },
      ]
    : [];

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
            className="absolute top-full left-1/2 mt-2 w-[min(26rem,92vw)] -translate-x-1/2 transform overflow-hidden rounded-3xl border border-white/10 bg-[#040F2A]/95 text-white shadow-[0_20px_40px_rgba(6,16,40,0.45)] backdrop-blur-3xl sm:left-auto sm:right-0 sm:mt-3 sm:w-[26rem] sm:translate-x-0 sm:transform-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
          >
            <div className="border-b border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5">
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
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-white/60">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
                      Active today
                    </span>
                    <span className="hidden sm:inline-flex">Counselor access enabled</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4" role="none">
              {metrics.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Wellness snapshot</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={`flex flex-col rounded-xl border border-white/10 bg-gradient-to-br ${metric.accent} px-3 py-2 text-left shadow-lg shadow-black/10`}
                        title={metric.description}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-white/70">
                          {metric.icon}
                          <span>{metric.label}</span>
                        </div>
                        <span className="mt-1 text-lg font-semibold text-white">{metric.value}</span>
                        <span className="text-[11px] text-white/60">{metric.caption}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <p className="text-[11px] text-white/60">{tile.subtitle}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Streak tracker</p>
                  <div className="mt-2 text-sm text-white/80">
                    {wellness ? (
                      <>
                        <span className="font-semibold text-white">{wellness.current_streak} days</span> current streak • longest{" "}
                        <span className="font-semibold text-white">{wellness.longest_streak}</span> days
                      </>
                    ) : (
                      "Keep completing quests to build your streak."
                    )}
                  </div>
                </div>

                <motion.button
                  onClick={onSignOut}
                  whileHover={{ backgroundColor: "rgba(248, 113, 113, 0.12)" }}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-full w-full items-center justify-center gap-2 rounded-2xl border border-red-400/60 px-4 py-2.5 text-sm font-semibold text-red-200 transition-all duration-200 hover:border-red-300 hover:text-red-50"
                  role="menuitem"
                >
                  <FiLogOut className="h-4 w-4" />
                  Sign out
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}






