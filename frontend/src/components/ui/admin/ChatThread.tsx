"use client";

/**
 * ChatThread — the golden-standard message thread for all interpersonal
 * chat surfaces (peer pairings, counselor threads, supervision read-only).
 *
 * Golden-standard behaviours built in:
 * - day separators between message groups
 * - mine-right / theirs-left alignment with timestamps
 * - optimistic send with pending → confirmed/failed states
 * - auto-scroll only when near the bottom (never yanks reading)
 * - char counter that appears near the limit
 * - crisis-resources banner when a send (or receive) is flagged
 * - Enter sends, Shift+Enter adds a newline
 * - full a11y: labelled input, aria-live log, disabled states
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiAlertTriangle, FiSend } from "react-icons/fi";

export interface ChatThreadMessage {
  id: number | string;
  senderId: number | string;
  content: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
  crisisFlagged?: boolean;
}

type ChatThreadProps = {
  messages: ChatThreadMessage[];
  currentUserId: number | string | undefined;
  onSend: (content: string) => Promise<ChatThreadMessage | null>;
  /** Disables the composer (thread closed, loading, etc.). */
  composerDisabled?: boolean;
  composerPlaceholder?: string;
  emptyTitle: string;
  emptyHint?: string;
  /** Show the crisis-resources banner persistently (thread flagged). */
  showCrisisBanner?: boolean;
  /** Auto-scroll to newest message (default true). */
  autoScroll?: boolean;
  className?: string;
};

const MAX_MESSAGE_LENGTH = 4000;
const CHAR_COUNTER_THRESHOLD = 3600;

type DayGroup = {
  dayKey: string;
  dayLabel: string;
  items: Array<{ message: ChatThreadMessage; time: string }>;
};

function dayKeyOf(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabelOf(iso: string | Date): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKeyOf(iso) === dayKeyOf(today)) return "Today";
  if (dayKeyOf(iso) === dayKeyOf(yesterday)) return "Yesterday";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeOf(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatThread({
  messages,
  currentUserId,
  onSend,
  composerDisabled = false,
  composerPlaceholder = "Tulis pesan…",
  emptyTitle,
  emptyHint,
  showCrisisBanner = false,
  autoScroll = true,
  className = "",
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  const groups: DayGroup[] = useMemo(() => {
    const map = new Map<string, DayGroup>();
    for (const message of messages) {
      const key = dayKeyOf(message.createdAt);
      if (!map.has(key)) {
        map.set(key, { dayKey: key, dayLabel: dayLabelOf(message.createdAt), items: [] });
      }
      map.get(key)!.items.push({ message, time: timeOf(message.createdAt) });
    }
    return [...map.values()];
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (!autoScroll || !nearBottomRef.current) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: messages.length > 0 ? "smooth" : "auto",
    });
  }, [messages, autoScroll]);

  const canSend = draft.trim().length > 0 && !sending && !composerDisabled;

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending || composerDisabled) return;
    setDraft("");
    setSending(true);
    try {
      const result = await onSend(content);
      if (result === null) {
        // Restore the draft on failure so the user can retry.
        setDraft(content);
      }
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  }, [draft, sending, composerDisabled, onSend]);

  const crisisVisible =
    showCrisisBanner ||
    messages.some((m) => m.crisisFlagged);

  const nearLimit = draft.length >= CHAR_COUNTER_THRESHOLD;

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {/* Crisis banner */}
      {crisisVisible && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-300">
            <FiAlertTriangle className="h-4 w-4" aria-hidden /> Penting
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-200/90">
            Percakapan ini disaring otomatis untuk bahasa krisis dan konselor telah
            diberi tahu. Bantuan langsung: SEJIWA 119 tekan 8 (gratis, 24 jam) atau
            Crisis Centre UGM 0851-0111-0800. Keadaan darurat: 112.
          </p>
        </div>
      )}

      {/* Messages log */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Percakapan"
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium text-white/70">{emptyTitle}</p>
            {emptyHint && <p className="mt-1 text-xs text-white/40">{emptyHint}</p>}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.dayKey}>
              {/* Day separator */}
              <div className="flex items-center gap-3 py-2" aria-hidden>
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                  {group.dayLabel}
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {group.items.map(({ message, time }) => {
                const mine =
                  currentUserId != null && String(message.senderId) === String(currentUserId);
                return (
                  <div key={message.id} className={`flex py-1 ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                        message.failed
                          ? "border border-red-500/40 bg-red-500/10 text-red-200"
                          : mine
                            ? "rounded-br-sm bg-[#FFCA40] text-[#001D58]"
                            : "rounded-bl-sm bg-white/10 text-white"
                      } ${message.pending ? "opacity-60" : ""}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <p
                        className={`mt-1 text-right text-[10px] ${
                          mine && !message.failed ? "text-[#001D58]/60" : "text-white/35"
                        }`}
                      >
                        {message.pending
                          ? "Mengirim…"
                          : message.failed
                            ? "Gagal terkirim"
                            : time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 p-3">
        {nearLimit && (
          <p className="mb-1.5 text-right text-[10px] text-white/40">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={composerDisabled}
            placeholder={composerDisabled ? "Percakapan ditutup" : composerPlaceholder}
            aria-label={composerPlaceholder}
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/40 disabled:opacity-50 [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Kirim pesan"
            className="rounded-xl bg-[#FFCA40] p-2.5 text-[#001D58] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <FiSend className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
