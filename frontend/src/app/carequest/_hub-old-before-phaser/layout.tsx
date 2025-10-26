"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMapPin,
  FiUsers,
  FiActivity,
  FiLayers,
  FiArrowLeft,
  FiSmile,
  FiHeart,
  FiRefreshCcw,
  HiChevronDown,
} from "@/icons";
import { cn } from "@/lib/utils";
import { useWellnessState } from "@/hooks/useQuests";
import ProfileDropdown from "@/components/ui/ProfileDropdown";

const NAV_ITEMS = [
  { href: "/carequest", label: "Gameplay", icon: FiActivity, activeMatch: /^\/carequest(?:\/)?$/ },
  { href: "/carequest/map", label: "Map", icon: FiMapPin, activeMatch: /^\/carequest\/map/ },
  { href: "/carequest/guilds", label: "Guilds", icon: FiUsers, activeMatch: /^\/carequest\/guilds/ },
  { href: "/carequest/activities", label: "Activities", icon: FiLayers, activeMatch: /^\/carequest\/activities/ },
];

const formatMetric = (value: number | null | undefined, digits = 1) =>
  (typeof value === "number" ? value : 0).toFixed(digits);

export default function CareQuestHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: wellness } = useWellnessState();
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const metrics = [
    { label: "Harmony", value: formatMetric(wellness?.harmony_score, 1), icon: FiActivity, accent: "text-[#BFDBFE]" },
    { label: "JOY", value: formatMetric(wellness?.joy_balance, 0), icon: FiSmile, accent: "text-[#FACC15]" },
    { label: "CARE", value: formatMetric(wellness?.care_balance, 2), icon: FiHeart, accent: "text-[#F472B6]" },
  ];

  const handleConfirmBack = () => {
    setShowBackConfirm(false);
    router.push("/dashboard");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#010a1f] text-white">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#010a1f]/90 px-4 py-4 backdrop-blur lg:px-8 lg:py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBackConfirm(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/60 bg-[#1E3A8A]/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#BFDBFE] transition hover:border-[#93C5FD]/80 hover:bg-[#1E40AF]/50 hover:text-white"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back
              </motion.button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">CareQuest Hub</p>
                <h1 className="text-lg font-semibold text-white">Play to Care • Guild Ecosystem</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.35)] lg:flex">
                {metrics.map(({ label, value, icon: Icon, accent }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1533]/80", accent)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col leading-tight text-left">
                      <span className="text-sm font-semibold text-white">{value}</span>
                      <span className="text-[11px] uppercase tracking-[0.28em] text-white/60">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {status === "authenticated" && session?.user ? (
                <div className="relative">
                  <motion.button
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-white/25"
                    aria-haspopup="true"
                    aria-expanded={isProfileOpen ? "true" : "false"}
                  >
                    <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-white/20">
                      <Image
                        src={session.user.image || "/default-avatar.png"}
                        alt={session.user.name || "User"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="hidden text-sm font-medium text-white/80 lg:block">
                      {session.user.name?.split(" ")[0]}
                    </span>
                    <motion.span animate={{ rotate: isProfileOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <HiChevronDown className="text-white/60" size={14} />
                    </motion.span>
                  </motion.button>
                  <ProfileDropdown
                    isOpen={isProfileOpen}
                    user={session.user}
                    wellness={wellness}
                    onClose={() => setIsProfileOpen(false)}
                    onSignOut={handleSignOut}
                  />
                </div>
              ) : status === "unauthenticated" ? (
                <Link
                  href="/signin"
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Sign In
                </Link>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon, activeMatch }) => {
              const isActive = href ? activeMatch?.test(pathname) : false;
              const baseClasses =
                "group flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition";
              if (href) {
                return (
                  <Link
                    key={label}
                    href={href}
                    className={cn(
                      baseClasses,
                      isActive
                        ? "border-[#5eead4]/60 bg-[#5eead4]/15 text-[#5eead4]"
                        : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              }

              return (
                <span
                  key={label}
                  className={cn(baseClasses, "cursor-not-allowed border-white/10 bg-white/5 text-white/40")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="pt-[116px] md:pt-[126px]">{children}</main>

      <AnimatePresence>
        {showBackConfirm ? (
          <motion.div
            key="carequest-back-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/70 backdrop-blur"
            onClick={() => setShowBackConfirm(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-[min(360px,90vw)] rounded-2xl border border-white/15 bg-[#0b1533]/95 px-6 py-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-white">Return to AICare?</h2>
              <p className="mt-2 text-sm text-white/70">
                You’ll leave CareQuest and return to the main dashboard. Any unsaved progress in this view will be lost.
              </p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBackConfirm(false)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBack}
                  className="inline-flex items-center gap-2 rounded-full border border-[#5eead4]/40 bg-[#5eead4]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#5eead4] transition hover:border-[#5eead4]/70 hover:text-white"
                >
                  <FiRefreshCcw className="h-4 w-4" />
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
