"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMapPin, FiUsers, FiActivity, FiLayers, FiArrowLeft } from "@/icons";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/carequest", label: "Map", icon: FiMapPin, activeMatch: /^\/carequest(?:\/)?$/ },
  { href: "/carequest/guilds", label: "Guilds", icon: FiUsers, activeMatch: /^\/carequest\/guilds/ },
  { href: "/carequest/activities", label: "Activities", icon: FiActivity, activeMatch: /^\/carequest\/activities/ },
  { href: null, label: "Arcade", icon: FiLayers, comingSoon: true },
];

export default function CareQuestHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#010a1f] text-white">
      <header className="fixed left-0 right-0 top-0 z-40 flex flex-col gap-3 border-b border-white/10 bg-[#010a1f]/90 px-4 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-5">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to AICare
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">CareQuest Hub</p>
            <h1 className="text-lg font-semibold text-white">Play to Care • Guild Ecosystem</h1>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon, comingSoon, activeMatch }) => {
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
                title={comingSoon ? "Coming soon" : undefined}
                className={cn(
                  baseClasses,
                  "cursor-not-allowed border-white/10 bg-white/5 text-white/40",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            );
          })}
        </nav>
      </header>

      <main className="pt-[88px] md:pt-[96px]">{children}</main>
    </div>
  );
}
