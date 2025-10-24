'use client';

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QuestHud from "@/components/quests/QuestHud";
import QuestDialogueWindow from "@/components/quests/QuestDialogueWindow";
import {
  FiShield,
  FiUsers,
  FiBell,
  FiCompass,
  FiActivity,
  FiMessageSquare,
  FiX,
} from "@/icons";
import { cn } from "@/lib/utils";
import { CareQuestLeafletMap, FacultyArea } from "@/components/carequest/CareQuestLeafletMap";
import BreathingCircleMiniGame from "@/components/carequest/BreathingCircleMiniGame";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";

type NodeStatus = "stable" | "threatened" | "cleansing";

interface CareQuestNode {
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

const CAREQUEST_NODES: CareQuestNode[] = [
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
      [-7.77047, 110.3817],
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
      [-7.7693, 110.37731],
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
      [-7.76652, 110.3755],
      [-7.7653, 110.37533],
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

type HubModalKey = "questHud" | "nodeIntel" | "gloomAlerts" | "alliedCohorts" | "dialogue";

const ACTION_BUTTONS: Array<{
  key: HubModalKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "questHud", label: "Tracker", description: "Harmony, JOY & streaks", icon: FiActivity },
  { key: "nodeIntel", label: "Node Intel", description: "Selected node intel", icon: FiShield },
  { key: "gloomAlerts", label: "Alerts", description: "Live dispatch feed", icon: FiBell },
  { key: "alliedCohorts", label: "Guilds", description: "Guild resonance", icon: FiUsers },
  { key: "dialogue", label: "Dialogue", description: "Aika briefing", icon: FiMessageSquare },
];

export default function CareQuestPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(CAREQUEST_NODES[0]?.id ?? "");
  const [openModal, setOpenModal] = useState<HubModalKey | null>(null);

  const selectedNode = useMemo(
    () => CAREQUEST_NODES.find((node) => node.id === selectedNodeId) ?? null,
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

  const renderModalContent = (key: HubModalKey) => {
    switch (key) {
      case "questHud":
        return <QuestHud className="!mx-0 !mb-0 !mt-0 w-full" />;
      case "nodeIntel":
        if (!selectedNode) {
          return <p className="text-sm text-white/70">Select a CareQuest node to view its intel and active quest.</p>;
        }
        return (
          <div className="space-y-4 text-sm text-white/80">
            <div
              className={cn(
                "flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r px-3 py-2 text-xs uppercase tracking-wide text-white shadow-inner shadow-[#00153a]/30",
                STATUS_STYLES[selectedNode.status].className,
              )}
            >
              <span>{selectedNode.zone}</span>
              <span className="font-semibold text-white">{STATUS_STYLES[selectedNode.status].label}</span>
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
            <div className="grid gap-2 text-xs uppercase tracking-wide text-white/60 sm:grid-cols-2">
              <p>Guild Control • <span className="text-white/80">{selectedNode.guildControl}</span></p>
              <p>Gloom Level • <span className="text-white/80">{selectedNode.gloomLevel}%</span></p>
            </div>
            {selectedNode.id === "library-courtyard" ? (
              <BreathingCircleMiniGame className="mt-2" />
            ) : null}
          </div>
        );
      case "gloomAlerts":
        return (
          <div className="space-y-3 text-sm text-white/70">
            {LIVE_EVENTS.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-[#01122a]/80 px-4 py-3 shadow-inner shadow-[#001324]/40"
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
        );
      case "alliedCohorts":
        return (
          <div className="space-y-3 text-sm text-white/70">
            {GUILD_STATUS.map((guild) => (
              <div
                key={guild.name}
                className="rounded-2xl border border-white/10 bg-[#010c20]/85 px-4 py-3 shadow-inner shadow-[#00152f]/40"
              >
                <p className="text-white font-semibold">{guild.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {guild.membersOnline} online • Harmony {guild.harmonyContribution.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-white/60">
                  Compassion Reserve • {guild.compassionReserve.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        );
      case "dialogue":
        if (!dialogueLines.length) {
          return <p className="text-sm text-white/70">No dialogue briefing available yet. Sync a node to unlock.</p>;
        }
        return (
          <QuestDialogueWindow
            lines={dialogueLines}
            tone={selectedNode?.status === "threatened" ? "urgent" : "supportive"}
            title={selectedNode?.name ?? "CareQuest Node"}
          />
        );
      default:
        return null;
    }
  };

  const activeButton = openModal ? ACTION_BUTTONS.find((btn) => btn.key === openModal) : null;
  const isDialogueAvailable = dialogueLines.length > 0;

  return (
    <div className="relative min-h-[calc(100vh-88px)] w-full overflow-hidden bg-[#010a1f] text-white md:min-h-[calc(100vh-96px)]">
      <div className="absolute inset-0 z-0">
        <CareQuestLeafletMap
          campusCenter={CAMPUS_CENTER}
          campusBounds={CAMPUS_BOUNDS}
          facultyAreas={FACULTY_AREAS}
          nodes={CAREQUEST_NODES.map((node) => ({
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

      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute left-4 top-6 flex flex-col gap-4 sm:left-6 sm:top-8">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#021230]/80 px-4 py-2 text-xs uppercase tracking-[0.32em] text-white/70 backdrop-blur">
            <FiCompass className="h-4 w-4 text-[#FFCA40]" />
            CareQuest Map
          </div>

          {selectedNode ? (
            <div className="max-w-xs rounded-2xl border border-white/10 bg-[#021230]/70 px-4 py-3 text-xs text-white/70 shadow-[0_10px_24px_rgba(2,16,45,0.45)] backdrop-blur">
              <p className="text-sm font-semibold text-white">{selectedNode.name}</p>
              <p className="uppercase tracking-[0.2em] text-white/50">{selectedNode.zone}</p>
              <p className="mt-2 line-clamp-3">{selectedNode.description}</p>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto absolute right-4 top-6 flex flex-col items-end gap-2 sm:right-6 sm:top-8">
          {ACTION_BUTTONS.map(({ key, label, description, icon: Icon }) => {
            const disabled = key === "dialogue" && !isDialogueAvailable;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setOpenModal(key)}
                disabled={disabled}
                className={cn(
                  "group flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
                  disabled
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-white/35"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/35 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:not-sr-only">{description}</span>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-auto absolute bottom-6 left-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#021230]/80 px-4 py-3 text-xs text-white/70 backdrop-blur sm:left-6">
          <LegendDot colorClass="bg-emerald-400" label="Stable" />
          <LegendDot colorClass="bg-amber-400" label="Threatened" />
          <LegendDot colorClass="bg-sky-400" label="Cleansing" />
          <LegendDot colorClass="bg-[#FFCA40]" label="Selected" />
        </div>
      </div>

      <AnimatePresence>
        {openModal ? (
          <motion.div
            key="carequest-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-[#010a1f]/75 backdrop-blur"
            onClick={() => setOpenModal(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-[min(640px,90vw)] rounded-[28px] border border-white/10 bg-[#020a1d]/95 p-6 text-white shadow-[0_20px_60px_rgba(3,12,32,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition hover:border-white/40 hover:text-white"
              >
                <FiX className="h-4 w-4" />
              </button>
              {activeButton ? (
                <div className="mb-4 flex items-center gap-3">
                  <activeButton.icon className="h-5 w-5 text-[#5eead4]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">{activeButton.label}</p>
                    <h2 className="text-lg font-semibold text-white">{activeButton.description}</h2>
                  </div>
                </div>
              ) : null}
              <div className="space-y-4 text-sm text-white/80">{renderModalContent(openModal)}</div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
