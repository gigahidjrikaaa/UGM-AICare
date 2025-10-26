'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { FiPlay, FiActivity, FiMapPin, FiTarget } from "@/icons";

const MINI_GAMES = [
  {
    slug: "breathing-circle",
    title: "4-7-8 Breathing Circle",
    status: "Playable",
    duration: "3 cycles • ~4 minutes",
    description:
      "Soothe the Central Library Courtyard by guiding your breathing alongside the expanding CareSphere.",
    route: "/carequest",
  },
  {
    slug: "gratitude-mosaic",
    title: "Gratitude Mosaic (Prototype)",
    status: "In production",
    duration: "5 minutes",
    description: "Co-create a shared emotion collage with your guild to unlock JOY multipliers.",
    route: null,
  },
  {
    slug: "focus-sprint",
    title: "Focus Sprint Pomodoro",
    status: "In production",
    duration: "25 minute sprint",
    description: "Maintain innovation hive stability with synchronized Pomodoro check-ins.",
    route: null,
  },
  {
    slug: "serenity-pulse",
    title: "Serenity Pulse Rhythm",
    status: "Design phase",
    duration: "Beat-based raid",
    description: "Hit the beats to push back heightened Gloom during raid escalations.",
    route: null,
  },
];

const PRACTICE_ROUTINES = [
  {
    title: "Morning reset",
    tooltip: "Guided breathing + 2 minute gratitude prompt",
  },
  {
    title: "Midday focus",
    tooltip: "Mini Pomodoro + posture reset stretches",
  },
  {
    title: "Evening unwind",
    tooltip: "Breathing + journaling reflections",
  },
  {
    title: "Guild raid prep",
    tooltip: "Sync breathing cadence before major raids",
  },
];

export default function ActivitiesPage() {
  return (
    <div className="space-y-8 px-4 pb-12 pt-4 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">CareQuest Hub</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Activities & Mini-Games</h1>
          <span className="rounded-full border border-[#FFCA40]/40 bg-[#FFCA40]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#FFCA40]">
            Roadmap
          </span>
        </div>
        <p className="max-w-3xl text-sm text-white/70">
          Explore ready-to-play activities and track upcoming releases. Each CareQuest activity ladders into node health,
          JOY, and guild buffs. Mini-games are built to run natively in the browser via canvas or WebGL.
        </p>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-[28px] border border-white/10 bg-[#010f24]/80 p-5 shadow-[0_18px_36px_rgba(3,16,45,0.45)] backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#5eead4]/15 p-3 text-[#5eead4]">
            <FiPlay className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Mini-games</p>
            <h2 className="text-lg font-semibold text-white">Interactive Care Experiences</h2>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {MINI_GAMES.map((game) => (
            <div
              key={game.slug}
              className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 shadow-inner shadow-[#00152f]/40"
            >
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em]">
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white/60">
                    {game.status}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/50">{game.duration}</span>
                </div>
                <p className="mt-2 text-base font-semibold text-white">{game.title}</p>
                <p className="mt-2 text-sm text-white/70">{game.description}</p>
              </div>
              <div className="mt-4">
                {game.route ? (
                  <Link
                    href={game.route}
                    className="inline-flex items-center gap-2 rounded-full border border-[#5eead4]/40 bg-[#5eead4]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#5eead4] transition hover:border-[#5eead4]/70 hover:text-white"
                  >
                    Launch activity
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid gap-5 md:grid-cols-[2fr_1fr]"
      >
        <div className="rounded-[28px] border border-white/10 bg-[#010b1d]/80 p-5 shadow-[0_18px_38px_rgba(3,16,45,0.45)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
              <FiActivity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Routine Builder</p>
              <h2 className="text-lg font-semibold text-white">Daily Practice Presets</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Combine mini-games, journaling, and group rituals into guided flows. Presets will trigger notifications and
            automatically log completion to your quest streak.
          </p>
          <ul className="mt-4 grid gap-3 text-xs uppercase tracking-[0.22em] text-white/60 sm:grid-cols-2">
            {PRACTICE_ROUTINES.map((routine) => (
              <li key={routine.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3" title={routine.tooltip}>
                {routine.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#020d1c]/85 p-5 shadow-[0_18px_38px_rgba(3,16,45,0.45)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#5eead4]/15 p-3 text-[#5eead4]">
              <FiMapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Node Integrations</p>
              <h2 className="text-lg font-semibold text-white">Map Hooks</h2>
            </div>
          </div>
          <p className="text-sm text-white/70">
            Activities will attach to specific nodes. Completing them reduces Gloom or unlocks limited-time buffs.
          </p>
          <ul className="space-y-2 text-xs uppercase tracking-[0.22em] text-white/60">
            <li>• Library Courtyard → Breathing Circle • Harmony drop</li>
            <li>• Student Hall → Gratitude Mosaic • JOY boost</li>
            <li>• Innovation Hive → Focus Sprint • Raid shield</li>
            <li>• Arts Studio → Emotional Palette • Cosmetic tokens</li>
          </ul>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="rounded-[28px] border border-white/10 bg-[#010f24]/80 p-5 shadow-[0_20px_42px_rgba(3,16,45,0.5)] backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
            <FiTarget className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Feedback Loop</p>
            <h2 className="text-lg font-semibold text-white">Help Shape CareQuest</h2>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/70">
          Share which activities your guild needs most. We’re collecting input on guided meditations, collaborative rhythm
          games, and AR-assisted routines. Drop feedback in #carequest-alpha or through the in-app feedback form.
        </p>
      </motion.section>
    </div>
  );
}
