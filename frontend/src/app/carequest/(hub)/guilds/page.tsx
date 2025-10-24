'use client';

import { motion } from "framer-motion";
import { FiUsers, FiAward, FiTrendingUp, FiZap } from "@/icons";

const GUILDS = [
  {
    name: "Aurora Collective",
    membersOnline: 12,
    totalMembers: 34,
    harmonyContribution: 1280,
    compassionReserve: 54,
    currentBuff: "Glowshield • 10% less Gloom per raid",
  },
  {
    name: "Resonance Scholars",
    membersOnline: 9,
    totalMembers: 27,
    harmonyContribution: 1135,
    compassionReserve: 42,
    currentBuff: "Focus Beacon • +5% mini-game score",
  },
  {
    name: "Circuit Guardians",
    membersOnline: 7,
    totalMembers: 19,
    harmonyContribution: 980,
    compassionReserve: 38,
    currentBuff: "Momentum Surge • +1 raid energy/hour",
  },
];

const QUESTS = [
  {
    title: "Evening Serenity Raid",
    node: "Central Library Courtyard",
    time: "Tonight 20:00",
    description: "Coordinate a breathing circle wave to push Gloom below 30%.",
  },
  {
    title: "Gratitude Volley",
    node: "Wisdom Student Hall",
    time: "Daily Reset",
    description: "Share three wins with another guild and unlock a buff exchange.",
  },
  {
    title: "Circuit Calibration",
    node: "Engineering Innovation Hive",
    time: "Week-long Challenge",
    description: "Maintain a 25-minute focus streak every day for bonus Harmony.",
  },
];

export default function GuildsPage() {
  return (
    <div className="space-y-6 px-4 pb-12 pt-4 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">CareQuest Hub</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Guild Network</h1>
          <span className="rounded-full border border-[#5eead4]/40 bg-[#5eead4]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#5eead4]">
            Alpha Preview
          </span>
        </div>
        <p className="max-w-3xl text-sm text-white/70">
          Track guild health, active raids, and collaborative buffs. Future updates will add live raid lobbies,
          cross-guild diplomacy, and leaderboard events.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4 rounded-[28px] border border-white/10 bg-[#010f24]/80 p-5 shadow-[0_18px_40px_rgba(3,16,45,0.45)] backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
              <FiUsers className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Live Guilds</p>
              <h2 className="text-lg font-semibold text-white">Alliance Overview</h2>
            </div>
          </div>

          <div className="space-y-4">
            {GUILDS.map((guild) => (
              <div
                key={guild.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 shadow-inner shadow-[#00152f]/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{guild.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {guild.membersOnline} online • {guild.totalMembers} members
                    </p>
                  </div>
                  <span className="rounded-full border border-[#5eead4]/40 bg-[#5eead4]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">
                    {guild.currentBuff}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-xs uppercase tracking-[0.18em] text-white/60 sm:grid-cols-3">
                  <span>
                    Harmony •{" "}
                    <span className="font-semibold text-white">{guild.harmonyContribution.toLocaleString()}</span>
                  </span>
                  <span>
                    Compassion •{" "}
                    <span className="font-semibold text-white">{guild.compassionReserve.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[#FFCA40]">
                    <FiTrendingUp className="h-4 w-4" />
                    Momentum Stable
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="space-y-4 rounded-[28px] border border-white/10 bg-[#020d1c]/85 p-5 shadow-[0_18px_40px_rgba(3,16,45,0.45)] backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
              <FiAward className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Competitive Pulse</p>
              <h2 className="text-lg font-semibold text-white">Upcoming Objectives</h2>
            </div>
          </div>
          <div className="space-y-3 text-sm text-white/70">
            {QUESTS.map((quest) => (
              <div key={quest.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.28em] text-[#FFCA40]">{quest.time}</p>
                <p className="mt-1 text-sm font-semibold text-white">{quest.title}</p>
                <p className="text-xs text-white/60">{quest.node}</p>
                <p className="mt-2 text-xs text-white/70">{quest.description}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#5eead4]/30 bg-[#5eead4]/10 p-3 text-xs text-[#5eead4]">
            Cross-guild diplomacy, raid scheduling, and seasonal tournaments are in development. Share feedback in the
            Council channel to shape the next release.
          </div>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="rounded-[28px] border border-white/10 bg-[#010f24]/80 p-5 shadow-[0_18px_40px_rgba(3,16,45,0.45)] backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
            <FiZap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Roadmap Snapshot</p>
            <h2 className="text-lg font-semibold text-white">What’s Next for Guilds</h2>
          </div>
        </div>
        <ul className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/60">
            Live raid lobbies with real-time timers
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/60">
            Guild tech tree & shared buffs
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/60">
            Contribution-based reward tiers
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/60">
            Inter-guild diplomacy missions
          </li>
        </ul>
      </motion.section>
    </div>
  );
}
