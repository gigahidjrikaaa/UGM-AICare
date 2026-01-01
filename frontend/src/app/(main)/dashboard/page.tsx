"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "react-hot-toast";

import {
  BsChatDots,
  FiActivity,
  FiArrowRight,
  FiAward,
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
} from "@/icons";
import WalletLinkButton from "@/components/ui/WalletLinkButton";
import QuestBoard from "@/components/quests/QuestBoard";
import apiClient, { fetchUserProfileOverview } from "@/services/api";
import type { TimelineEntry, UserProfileOverviewResponse } from "@/types/profile";

interface EarnedBadgeSummary {
  badge_id: number;
  awarded_at: string;
}

type DashboardTimelineEntry = TimelineEntry & { formattedTimestamp: string };

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

const quickActions: QuickAction[] = [
  {
    href: "/aika",
    label: "Talk with Aika",
    description: "Open a new session to chat or reflect.",
    icon: <BsChatDots className="h-5 w-5" />,
  },
  {
    href: "/journaling",
    label: "Log a reflection",
    description: "Capture today's thoughts in your journal.",
    icon: <FiActivity className="h-5 w-5" />,
  },
  {
    href: "/appointment",
    label: "Book support",
    description: "Schedule time with the counselling team.",
    icon: <FiCalendar className="h-5 w-5" />,
  },
];

// Streak Card with fire icon for current streak - blends with dark UI
function StreakCard({
  type,
  value,
}: {
  type: "current" | "longest";
  value: number;
}) {
  const isCurrent = type === "current";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-[#FFCA40]/30 hover:bg-white/[0.05]">
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
            isCurrent
              ? "bg-orange-500/20 shadow-lg shadow-orange-500/10"
              : "bg-purple-500/20 shadow-lg shadow-purple-500/10"
          }`}
        >
          {isCurrent ? "🔥" : "🏆"}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">
            {isCurrent ? "Current Streak" : "Personal Best"}
          </p>
          <p className="text-lg font-bold text-white">
            {value} {value === 1 ? "day" : "days"}
          </p>
          <p className={`text-xs font-medium ${isCurrent ? "text-orange-400" : "text-purple-400"}`}>
            {isCurrent
              ? value > 0
                ? "Keep the fire going!"
                : "Start your streak today!"
              : value > 0
              ? "Your all-time record!"
              : "Set your first record!"}
          </p>
        </div>
      </div>
    </div>
  );
}

// Wellness Trend Card - blends with dark UI
function WellnessTrendCard({ score }: { score: number }) {
  // Score is 0-1 from backend, convert to percentage
  const percentage = Math.round(score * 100);

  // Map score to mood levels
  const getMoodData = (s: number) => {
    if (s >= 80) return { emoji: "😊", label: "Thriving", color: "emerald" };
    if (s >= 60) return { emoji: "🙂", label: "Doing Well", color: "green" };
    if (s >= 40) return { emoji: "😐", label: "Balanced", color: "yellow" };
    if (s >= 20) return { emoji: "😔", label: "Could Be Better", color: "orange" };
    return { emoji: "😢", label: "Need Support", color: "rose" };
  };

  const mood = getMoodData(percentage);
  const colorMap: Record<string, { text: string; bar: string; bg: string }> = {
    emerald: { text: "text-emerald-400", bar: "bg-emerald-400", bg: "bg-emerald-500/20" },
    green: { text: "text-green-400", bar: "bg-green-400", bg: "bg-green-500/20" },
    yellow: { text: "text-yellow-400", bar: "bg-yellow-400", bg: "bg-yellow-500/20" },
    orange: { text: "text-orange-400", bar: "bg-orange-400", bg: "bg-orange-500/20" },
    rose: { text: "text-rose-400", bar: "bg-rose-400", bg: "bg-rose-500/20" },
  };
  const colors = colorMap[mood.color];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-[#FFCA40]/30 hover:bg-white/[0.05]">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-white/60">Wellness Trend</p>
          <p className={`mt-1 text-lg font-bold ${colors.text}`}>{mood.label}</p>
        </div>
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${colors.bg}`}>
          {mood.emoji}
        </span>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/50">
        <span>Based on your conversations</span>
        <span className={`font-medium ${colors.text}`}>{percentage}%</span>
      </div>
    </div>
  );
}

// Badges Card - blends with dark UI
function BadgesCard({ count }: { count: number | null }) {
  const displayCount = count ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-[#FFCA40]/30 hover:bg-white/[0.05]">
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFCA40]/20 text-2xl shadow-lg shadow-[#FFCA40]/10">
          🎖️
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">Badges Earned</p>
          <p className="text-lg font-bold text-white">
            {count !== null ? displayCount : "--"} {displayCount === 1 ? "badge" : "badges"}
          </p>
          <p className="text-xs font-medium text-[#FFCA40]">
            {displayCount > 0 ? "🎉 Keep achieving!" : "Unlock your first badge!"}
          </p>
        </div>
      </div>
      {/* Decorative stars */}
      <div className="absolute right-3 top-3 text-lg opacity-20">✨</div>
    </div>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition hover:border-[#FFCA40] hover:bg-[#FFCA40]/10"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#FFCA40]">
          {action.icon}
        </span>
        <div>
          <p className="text-base font-semibold text-white">{action.label}</p>
          <p className="text-sm text-white/60 group-hover:text-white/80">{action.description}</p>
        </div>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#FFCA40]">
        Get started
        <FiArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfileOverviewResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [badgeCount, setBadgeCount] = useState<number | null>(null);
  const [latestBadgeDate, setLatestBadgeDate] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      setProfileError(null);
      try {
        // First, refresh user stats to ensure they're current
        try {
          await apiClient.post("/profile/refresh-stats");
        } catch (error) {
          console.warn("Failed to refresh user stats (non-critical)", error);
          // Continue even if stats refresh fails
        }
        
        const result = await fetchUserProfileOverview();
        setProfile(result);
      } catch (error) {
        console.error("Failed to load dashboard overview", error);
        setProfileError("We couldn't load your dashboard. Please try again later.");
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile().catch(() => {
      /* handled above */
    });
  }, []);

  useEffect(() => {
    async function loadBadges() {
      try {
        const { data } = await apiClient.get<EarnedBadgeSummary[]>("/profile/my-badges");
        setBadgeCount(data.length);
        if (data.length) {
          const latest = data
            .slice()
            .sort((a, b) => new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime())[0];
          setLatestBadgeDate(formatTimestamp(latest.awarded_at));
        }
      } catch (error) {
        console.error("Failed to load badge summary", error);
        toast.error("Could not load your achievement summary");
      }
    }

    loadBadges().catch(() => {
      /* handled above */
    });
  }, []);

  const firstName = useMemo(() => {
    if (!profile) return "Friend";
    // Use only fields that exist on ProfileHeaderSummary.
    // Removed reference to `profile.header.name` which does not exist.
    const preferred = profile.header.preferred_name ?? profile.header.full_name ?? "";
    if (!preferred) return "Friend";
    return preferred.split(" ")[0];
  }, [profile]);

  const timelineEntries: DashboardTimelineEntry[] = useMemo(() => {
    if (!profile?.timeline?.length) return [];
    return profile.timeline.slice(0, 4).map((entry) => ({
      ...entry,
      formattedTimestamp: formatTimestamp(entry.timestamp),
    }));
  }, [profile?.timeline]);

  const upcomingAppointments = useMemo(() => {
    if (!profile?.timeline?.length) return [];
    const now = new Date();
    return profile.timeline
      .filter((entry) => entry.kind === "appointment" && new Date(entry.timestamp).getTime() > now.getTime())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, 3)
      .map((entry) => ({
        ...entry,
        formattedTimestamp: formatTimestamp(entry.timestamp),
      }));
  }, [profile?.timeline]);

  if (profileLoading) {
    return (
      <main className="min-h-screen text-white">
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-12">
          <div className="space-y-6">
            <div className="h-32 animate-pulse rounded-3xl bg-white/5" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
            <div className="h-60 animate-pulse rounded-3xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (profileError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#00112e] px-4">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm text-white/70">{profileError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-12 space-y-10">
        {/* Aika CTA Card - Prominent call to action */}
        <Link href="/aika" className="block">
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 p-6 shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:shadow-cyan-500/30">
            <div className="flex items-center gap-6">
              {/* Aika Avatar */}
              <div className="relative flex-shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white/30 shadow-xl">
                  <Image
                    src="/aika-avatar.png"
                    alt="Aika - Your AI Companion"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 h-4 w-4 animate-pulse rounded-full border-2 border-white bg-green-400" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Talk with Aika</h2>
                <p className="mt-1 text-white/80">
                  Your AI companion is ready to listen and support you, {firstName}
                </p>
              </div>

              {/* CTA Button */}
              <div className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-600 shadow-lg transition-all group-hover:scale-105 group-hover:shadow-xl">
                <BsChatDots className="h-5 w-5" />
                <span>Chat Now</span>
                <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-5 -left-5 h-20 w-20 rounded-full bg-white/5" />
          </div>
        </Link>

        {/* Stats Grid - Fun and differentiated cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StreakCard
            type="current"
            value={profile?.header.current_streak ?? 0}
          />
          <StreakCard
            type="longest"
            value={profile?.header.longest_streak ?? 0}
          />
          <WellnessTrendCard score={profile?.header.sentiment_score ?? 0.5} />
          <BadgesCard count={badgeCount} />
        </div>

        {/* Header section with greeting and wallet */}
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-md">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-wide text-white/60">Welcome back</p>
            <h1 className="text-3xl font-semibold text-white">Ready for your next check-in, {firstName}?</h1>
            <p className="text-sm text-white/70">
              Aika is available anytime. Start a session to reflect, release, and get support tailored to you.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/aika" className="w-full sm:w-auto">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#001D58] shadow-lg shadow-[#FFCA40]/40 transition hover:bg-[#ffd45c]">
                  Talk with Aika now
                  <FiArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link href="/journaling" className="w-full sm:w-auto">
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#FFCA40] hover:text-[#FFCA40]">
                  Log a reflection
                  <FiActivity className="h-4 w-4" />
                </span>
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Open Campus ID</p>
                <p className="mt-1 text-xs text-white/60">Connect your Web3 identity to earn CARE tokens</p>
              </div>
              <WalletLinkButton />
            </div>
          </div>
        </header>

        <QuestBoard />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-9">
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Recent activity</h2>
                  <p className="text-sm text-white/60">Highlights from your reflections, sessions, and achievements.</p>
                </div>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#FFCA40] hover:text-[#ffd45c]"
                >
                  View profile
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {timelineEntries.length === 0 ? (
                  <p className="text-sm text-white/60">No activity yet. Start with a reflection or conversation.</p>
                ) : (
                  timelineEntries.map((entry, index) => (
                    <div
                      key={`${entry.kind}-${entry.timestamp}-${index}`}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
                    >
                      <span className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFCA40]/15 text-[#FFCA40]">
                        <FiClock className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{entry.title}</p>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-wide text-white/60">
                            {entry.kind}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="mt-2 text-sm text-white/70">{entry.description}</p>
                        )}
                        <p className="mt-2 text-xs uppercase tracking-wide text-white/40">{entry.formattedTimestamp}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming appointments</h2>
                <Link
                  href="/appointment"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#FFCA40] hover:text-[#ffd45c]"
                >
                  Book
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-white/60">
                    You have no upcoming appointments scheduled.{' '}
                    <Link
                      href="/appointment"
                      className="font-semibold text-[#FFCA40] hover:text-[#ffd45c]"
                    >
                      Reserve a time
                    </Link>{' '}
                    to connect with the counselling team.
                  </p>
                ) : (
                  upcomingAppointments.map((entry, index) => (
                    <div
                      key={`${entry.timestamp}-${index}`}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
                    >
                      <span className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFCA40]/15 text-[#FFCA40]">
                        <FiCalendar className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{entry.title || 'Counselling session'}</p>
                        {entry.description && (
                          <p className="mt-1 text-sm text-white/70">{entry.description}</p>
                        )}
                        <p className="mt-2 text-xs uppercase tracking-wide text-white/40">{entry.formattedTimestamp}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-semibold">Achievements</h2>
              <p className="mt-2 text-sm text-white/60">
                {badgeCount != null
                  ? `You have unlocked ${badgeCount} badge${badgeCount === 1 ? "" : "s"}.`
                  : "We're loading your achievements."}
              </p>
              {latestBadgeDate && (
                <p className="mt-1 text-xs uppercase tracking-wide text-white/40">Last badge earned {latestBadgeDate}</p>
              )}
              <Link
                href="/profile"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#FFCA40] hover:text-[#FFCA40]"
              >
                View achievements
                <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-semibold">Focus for today</h2>
              <p className="mt-2 text-sm text-white/60">
                {profile?.safety.primary_concerns
                  ? profile.safety.primary_concerns
                  : "Set a small intention - try a reflection prompt or chat with Aika about how you're feeling."}
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Preferred check-in cadence</p>
                  <p>{profile?.therapy.therapy_frequency ?? "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Support team note</p>
                  <p>{profile?.aicare_team_notes ?? "Leave a note on your profile to let us know what you need right now."}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}


