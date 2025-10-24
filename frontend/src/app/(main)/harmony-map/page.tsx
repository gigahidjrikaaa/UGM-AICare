'use client';

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QuestHud from "@/components/quests/QuestHud";
import QuestDialogueWindow from "@/components/quests/QuestDialogueWindow";
import { FiShield, FiUsers, FiBell, FiCompass, FiChevronDown } from "@/icons";
import { cn } from "@/lib/utils";
import { HarmonyLeafletMap, FacultyArea } from "@/components/harmony-map/HarmonyLeafletMap";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";

type NodeStatus = "stable" | "threatened" | "cleansing";

interface HarmonyNode {
  id: string;
  name: string;
  zone: string;
  status: NodeStatus;
  description: string;
  activeQuest: {
    title: string;
    summary: string;
    action: string;
    reward: string;
  };
  gloomLevel: number;
  guildControl: string;
  position: LatLngExpression;
}

const HARMONY_NODES: HarmonyNode[] = [
  {
    id: "library-courtyard",
    name: "Central Library Courtyard",
    zone: "Knowledge Node",
    status: "threatened",
    description:
      "Gloom wisps circle the study benches as midterm stress peaks. Breathing rituals can calm the energy.",
    position: [-7.77043, 110.37798],
    activeQuest: {
      title: "Calm the Library Courtyard",
      summary: "Guide three peers through the 4-7-8 breathing technique and log the reflections together.",
      action: "Start a breathing circle with your guild or classmates nearby.",
      reward: "+35 Harmony • +15 JOY • Serenity Spark for guild",
    },
    gloomLevel: 72,
    guildControl: "Resonance Scholars",
  },
  {
    id: "student-hall",
    name: "Wisdom Student Hall",
    zone: "Community Node",
    status: "stable",
    description:
      "Guild banners flutter proudly. Counselors recently hosted a peer support session keeping gloom at bay.",
    position: [-7.76852, 110.37702],
    activeQuest: {
      title: "Celebrate Shared Wins",
      summary: "Host a gratitude circle and record three moments of joy from today's collaborations.",
      action: "Gather your guildmates for a five-minute gratitude circle.",
      reward: "+20 Harmony • +25 JOY • Guild morale boost",
    },
    gloomLevel: 21,
    guildControl: "Aurora Collective",
  },
  {
    id: "engineering-hive",
    name: "Engineering Innovation Hive",
    zone: "Resilience Node",
    status: "cleansing",
    description:
      "Counselor raid underway. Players must sustain focus rituals to finish the purge before the timer ends.",
    position: [-7.76932, 110.38145],
    activeQuest: {
      title: "Stabilize the Innovation Hive",
      summary: "Complete a Pomodoro sprint together and share productivity reflections to sustain the cleanse.",
      action: "Join a 25-minute focus sprint with your guild via the raid portal.",
      reward: "+45 Harmony • +10 JOY • +0.5 Compassion multiplier",
    },
    gloomLevel: 54,
    guildControl: "Circuit Guardians",
  },
  {
    id: "arts-studio",
    name: "Lumbini Arts Studio",
    zone: "Identity Node",
    status: "stable",
    description:
      "Creative energy thrives here. Expressive therapy quests unlocked new avatar cosmetics for guildmates.",
    position: [-7.76585, 110.37462],
    activeQuest: {
      title: "Paint with Compassion",
      summary: "Create a digital collage expressing your current emotions. Share with guild for empathy tokens.",
      action: "Upload your collage into the guild gallery and leave supportive feedback for others.",
      reward: "+25 Harmony • +30 JOY • Cosmetic sketch unlocked",
    },
    gloomLevel: 18,
    guildControl: "Chromatic Kin",
  },
];

const FACULTY_AREAS: FacultyArea[] = [
  {
    id: "engineering",
    name: "Faculty of Engineering",
    description: "Innovation Hive: supports resilience quests and productivity rituals.",
    color: "#60A5FA",
    fillOpacity: 0.32,
    coordinates: [
      [-7.76964, 110.38197],
      [-7.77047, 110.38170],
      [-7.77079, 110.38285],
      [-7.76988, 110.38316],
    ],
  },
  {
    id: "medicine",
    name: "Faculty of Medicine",
    description: "Mindful care zone nurturing Compassion Mode activations.",
    color: "#F87171",
    fillOpacity: 0.3,
    coordinates: [
      [-7.76903, 110.37624],
      [-7.76975, 110.37589],
      [-7.77002, 110.37703],
      [-7.76930, 110.37731],
    ],
  },
  {
    id: "arts",
    name: "Faculty of Arts & Humanities",
    description: "Creative quests unlock expressive therapy and avatar cosmetics.",
    color: "#FBBF24",
    fillOpacity: 0.28,
    coordinates: [
      [-7.76524, 110.37402],
      [-7.76641, 110.37415],
      [-7.76652, 110.37550],
      [-7.76530, 110.37533],
    ],
  },
  {
    id: "economics",
    name: "Faculty of Economics & Business",
    description: "Hosts community quests focused on financial wellbeing and peer mentorship.",
    color: "#34D399",
    fillOpacity: 0.3,
    coordinates: [
      [-7.76748, 110.37854],
      [-7.76845, 110.37824],
      [-7.76864, 110.37956],
      [-7.76771, 110.37983],
    ],
  },
];

const CAMPUS_CENTER: LatLngExpression = [-7.7695, 110.3778];
const CAMPUS_BOUNDS: LatLngBoundsExpression = [
  [-7.7765, 110.371],
  [-7.762, 110.3855],
];

const LIVE_EVENTS = [
  {
    id: "event-1",
    title: "Counselor Raid: Shadow of Procrastination",
    time: "Starts in 18m",
    location: "Faculty of Economics",
    callToAction: "Join Raid Lobby",
  },
  {
    id: "event-2",
    title: "Peer Support Pop-Up",
    time: "Live Now",
    location: "Dormitory Harmony Lounge",
    callToAction: "Open Support Chat",
  },
  {
    id: "event-3",
    title: "Wellness Pool Briefing",
    time: "Tonight 21:00",
    location: "Aika Nexus Chamber",
    callToAction: "Set Reminder",
  },
];

const GUILD_STATUS = [
  { name: "Aurora Collective", membersOnline: 12, harmonyContribution: 1280, compassionReserve: 54 },
  { name: "Resonance Scholars", membersOnline: 9, harmonyContribution: 1135, compassionReserve: 42 },
  { name: "Circuit Guardians", membersOnline: 7, harmonyContribution: 980, compassionReserve: 38 },
];

const STATUS_STYLES: Record<NodeStatus, { label: string; className: string }> = {
  stable: { label: "Stable", className: "from-emerald-400/40 to-emerald-400/10 shadow-emerald-500/30" },
  threatened: { label: "Threatened", className: "from-amber-400/40 to-amber-400/10 shadow-amber-500/30" },
  cleansing: { label: "Cleansing", className: "from-sky-400/40 to-sky-400/10 shadow-sky-500/30" },
};

const PANEL_KEYS = ["questHud", "nodeIntel", "gloomAlerts", "alliedCohorts", "dialogue"] as const;
type PanelKey = (typeof PANEL_KEYS)[number];
const INITIAL_PANEL_STATE: Record<PanelKey, boolean> = {
  questHud: false,
  nodeIntel: false,
  gloomAlerts: false,
  alliedCohorts: false,
  dialogue: false,
};

export default function HarmonyMapPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(HARMONY_NODES[0]?.id ?? "");
  const [panelState, setPanelState] = useState<Record<PanelKey, boolean>>(INITIAL_PANEL_STATE);

  const selectedNode = useMemo(
    () => HARMONY_NODES.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId],
  );

  const dialogueLines = useMemo(() => {
    if (!selectedNode) return [];
    return [
      `${selectedNode.name} • ${STATUS_STYLES[selectedNode.status].label.toUpperCase()} • Gloom ${selectedNode.gloomLevel}%`,
      selectedNode.description,
      `Quest: ${selectedNode.activeQuest.title}`,
      selectedNode.activeQuest.summary,
      `Action: ${selectedNode.activeQuest.action}`,
      `Reward: ${selectedNode.activeQuest.reward}`,
    ];
  }, [selectedNode]);

  const togglePanel = useCallback((key: PanelKey) => {
    setPanelState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#010a1f] text-white">
      <div className="absolute inset-0 z-0">
        <HarmonyLeafletMap
          campusCenter={CAMPUS_CENTER}
          campusBounds={CAMPUS_BOUNDS}
          facultyAreas={FACULTY_AREAS}
          nodes={HARMONY_NODES.map((node) => ({
            id: node.id,
            name: node.name,
            description: node.description,
            status: node.status,
            statusLabel: STATUS_STYLES[node.status].label,
            zone: node.zone,
            gloomLevel: node.gloomLevel,
            position: node.position,
            isActive: node.id === selectedNodeId,
            color:
              node.status === "stable"
                ? "#34D399"
                : node.status === "threatened"
                ? "#FBBF24"
                : "#60A5FA",
            fillColor:
              node.status === "stable"
                ? "rgba(52,211,153,0.4)"
                : node.status === "threatened"
                ? "rgba(251,191,36,0.4)"
                : "rgba(96,165,250,0.4)",
            onSelect: setSelectedNodeId,
          }))}
          minZoom={16}
          maxZoom={18}
          className="h-full w-full"
          mapProps={{ zoomSnap: 0.25 }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,_rgba(59,167,181,0.25),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_bottom,_rgba(255,202,64,0.2),_transparent_60%)]" />

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between">
        <div className="space-y-4 px-4 pt-28 sm:px-6 sm:pt-32">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#021230]/80 px-4 py-3 text-xs uppercase tracking-[0.35em] text-white/70 backdrop-blur">
            <FiCompass className="h-4 w-4 text-[#FFCA40]" />
            Harmony Map • UGM Campus Twin
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="pointer-events-auto flex w-full flex-col gap-4 xl:max-w-[420px]">
              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#021230]/80 shadow-[0_16px_38px_rgba(4,20,54,0.35)] backdrop-blur">
                <button
                  type="button"
                  onClick={() => togglePanel("questHud")}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-white transition hover:bg-white/5"
                  aria-expanded={panelState.questHud}
                  aria-controls="harmony-tracker-panel"
                >
                  <span className="uppercase tracking-[0.18em] text-white/70">Harmony Tracker HUD</span>
                  <motion.span
                    animate={{ rotate: panelState.questHud ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white/80"
                  >
                    <FiChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {panelState.questHud ? (
                    <motion.div
                      key="questHudContent"
                      id="harmony-tracker-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-4 pt-2">
                        <QuestHud className="!mx-0 !mb-0 !mt-0 w-full" />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#041a3c]/80 via-[#01122a]/90 to-[#021230]/80 shadow-[0_16px_40px_rgba(4,20,54,0.36)] backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => togglePanel("nodeIntel")}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={panelState.nodeIntel}
                  aria-controls="node-intel-panel"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
                      <FiShield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Node Intel</p>
                      <h2 className="text-lg font-semibold text-white">
                        {selectedNode ? selectedNode.name : "Select a Harmony Node"}
                      </h2>
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: panelState.nodeIntel ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white/80"
                  >
                    <FiChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {panelState.nodeIntel ? (
                    <motion.div
                      key="nodeIntelContent"
                      id="node-intel-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden border-t border-white/10 bg-white/5"
                    >
                      <div className="space-y-3 px-5 pb-5 pt-4 text-sm text-white/80">
                        {selectedNode ? (
                          <>
                            <div
                              className={cn(
                                "flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r px-3 py-2 text-xs uppercase tracking-wide text-white shadow-inner shadow-[#00153a]/30",
                                STATUS_STYLES[selectedNode.status].className,
                              )}
                            >
                              <span>{selectedNode.zone}</span>
                              <span className="font-semibold text-white">
                                {STATUS_STYLES[selectedNode.status].label}
                              </span>
                            </div>
                            <p>{selectedNode.description}</p>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                              <p className="text-xs uppercase tracking-wide text-white/50">Active Quest</p>
                              <p className="mt-1 font-semibold text-white">{selectedNode.activeQuest.title}</p>
                              <p className="mt-1 text-white/70">{selectedNode.activeQuest.summary}</p>
                              <div className="mt-3 space-y-2 text-xs">
                                <p className="rounded-xl bg-[#FFCA40]/10 px-3 py-2 text-[#FFCA40]">
                                  Action • {selectedNode.activeQuest.action}
                                </p>
                                <p className="rounded-xl bg-[#3BA7B5]/10 px-3 py-2 text-[#5EEAD4]">
                                  Reward • {selectedNode.activeQuest.reward}
                                </p>
                              </div>
                            </div>
                            <div className="grid gap-2 text-xs uppercase tracking-wide text-white/60">
                              <p>Guild Control • <span className="text-white/80">{selectedNode.guildControl}</span></p>
                              <p>Gloom Level • <span className="text-white/80">{selectedNode.gloomLevel}%</span></p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-white/60">
                            Select a Harmony Node on the map to view its quest details and Gloom status.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.section>
            </div>

            <div className="pointer-events-auto flex w-full flex-col gap-4 xl:max-w-[360px]">
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_14px_32px_rgba(4,16,40,0.35)] backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => togglePanel("gloomAlerts")}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={panelState.gloomAlerts}
                  aria-controls="gloom-alerts-panel"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
                      <FiBell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Live Dispatch</p>
                      <h2 className="text-lg font-semibold text-white">Gloom Alerts</h2>
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: panelState.gloomAlerts ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white/80"
                  >
                    <FiChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {panelState.gloomAlerts ? (
                    <motion.div
                      key="gloomAlertsContent"
                      id="gloom-alerts-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden border-t border-white/10 bg-[#01122a]/40"
                    >
                      <div className="space-y-3 px-5 pb-5 pt-4">
                        {LIVE_EVENTS.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-2xl border border-white/10 bg-[#01122a]/80 px-4 py-3 text-sm text-white/70 shadow-inner shadow-[#001324]/40"
                          >
                            <p className="text-xs uppercase tracking-wide text-[#FFCA40]">{event.time}</p>
                            <p className="mt-1 font-semibold text-white">{event.title}</p>
                            <p className="text-xs text-white/60">{event.location}</p>
                            <button className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white">
                              {event.callToAction}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_12px_30px_rgba(4,12,32,0.32)] backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => togglePanel("alliedCohorts")}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={panelState.alliedCohorts}
                  aria-controls="allied-cohorts-panel"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#FFCA40]/15 p-3 text-[#FFCA40]">
                      <FiUsers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Guild Resonance</p>
                      <h2 className="text-lg font-semibold text-white">Allied Cohorts</h2>
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: panelState.alliedCohorts ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-full border border-white/20 bg-white/10 p-1 text-white/80"
                  >
                    <FiChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {panelState.alliedCohorts ? (
                    <motion.div
                      key="alliedCohortsContent"
                      id="allied-cohorts-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden border-t border-white/10 bg-[#010c20]/60"
                    >
                      <div className="space-y-3 px-5 pb-5 pt-4">
                        {GUILD_STATUS.map((guild) => (
                          <div
                            key={guild.name}
                            className="rounded-2xl border border-white/10 bg-[#010c20]/85 px-4 py-3 text-sm text-white/70"
                          >
                            <p className="text-white font-semibold">{guild.name}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs uppercase tracking-wide text-white/50">
                              <span>Online • <span className="text-white/70">{guild.membersOnline}</span></span>
                              <span>Harmony • <span className="text-[#5EEAD4]">{guild.harmonyContribution}</span></span>
                              <span>Compassion Reserve • <span className="text-[#FFCA40]">{guild.compassionReserve}</span></span>
                              <span className="text-[#A78BFA]">Boost • 1.2x Care yield</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.section>
            </div>
          </div>
        </div>

        <div className="px-4 pb-6 sm:px-6">
          <div className="pointer-events-auto inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#021230]/80 px-4 py-3 text-xs text-white/70 backdrop-blur">
            <LegendDot colorClass="bg-emerald-400" label="Stable node" />
            <LegendDot colorClass="bg-amber-400" label="Threatened node" />
            <LegendDot colorClass="bg-sky-400" label="Cleansing raid" />
            <LegendDot colorClass="bg-[#FFCA40]" label="Selected node" />
          </div>
        </div>
      </div>

      {dialogueLines.length > 0 && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[min(880px,92vw)] -translate-x-1/2">
          <div className="pointer-events-auto">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => togglePanel("dialogue")}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-[#021230]/80 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70 transition hover:border-white/30 hover:text-white"
                aria-expanded={panelState.dialogue}
                aria-controls="harmony-dialogue-panel"
              >
                Dialogue
                <motion.span
                  animate={{ rotate: panelState.dialogue ? 0 : -90 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-full border border-white/20 bg-white/10 p-1 text-white/80"
                >
                  <FiChevronDown className="h-3 w-3" />
                </motion.span>
              </button>
            </div>
            <AnimatePresence initial={false}>
              {panelState.dialogue ? (
                <motion.div
                  key="dialogueContent"
                  id="harmony-dialogue-panel"
                  initial={{ height: 0, opacity: 0, y: 12 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: 12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <QuestDialogueWindow
                    lines={dialogueLines}
                    tone={selectedNode?.status === "threatened" ? "urgent" : "supportive"}
                    title={selectedNode?.name ?? "Harmony Node"}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );

}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
      <span>{label}</span>
    </span>
  );
}
