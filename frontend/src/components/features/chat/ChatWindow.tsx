// src/components/features/chat/ChatWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

import { AgentThinkingBubble } from "../aika/AgentThinkingBubble";
import { ThinkingStep } from "@/types/thinking";
import { ArrowDown } from "lucide-react";
interface ChatWindowProps {
  messages: Message[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  onCancelAppointment?: (appointmentId: number, reason: string) => Promise<void>;
  onRescheduleAppointment?: (appointmentId: number, newDatetime: string) => Promise<void>;
  isLoading?: boolean;
  activeAgents?: string[];
  currentThinking?: string | null;
  onCardSelect?: (text: string) => void;
  onRegenerate?: (text: string) => void;

  userDisplayName?: string;
  userImageUrl?: string | null;

  /** New structured thinking steps props */
  thinkingSteps?: ThinkingStep[];
  elapsedSeconds?: number;
}

/** Distance from the bottom (px) within which we consider the user "at the bottom". */
const NEAR_BOTTOM_THRESHOLD_PX = 120;

export function ChatWindow({
  messages,
  chatContainerRef,
  onCancelAppointment,
  onRescheduleAppointment,
  isLoading,
  activeAgents = [],
  currentThinking,
  onCardSelect,
  onRegenerate,
  userDisplayName,
  userImageUrl,
  thinkingSteps,
  elapsedSeconds,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);

  const topFadeMaskStyle: React.CSSProperties = {
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 24px)',
    maskImage: 'linear-gradient(to bottom, transparent 0px, black 24px)',
  };

  // Track scroll position: auto-scroll only follows when the user is at (or
  // near) the bottom — scrolling up to read history must never be yanked.
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance < NEAR_BOTTOM_THRESHOLD_PX;
    isNearBottomRef.current = near;
    setIsNearBottom(near);
  }, [chatContainerRef]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Follow new content only while the user is at the bottom.
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const timeoutId = setTimeout(() => scrollToBottom('auto'), 50);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading, scrollToBottom]);

  const scrollToBottomManually = useCallback(() => {
    isNearBottomRef.current = true;
    setIsNearBottom(true);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  return (
    <div
      ref={chatContainerRef}
      role="log"
      aria-live="polite"
      aria-label="Percakapan dengan Aika"
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-transparent! px-2 pb-4 pt-4 sm:px-4 md:px-6"
      style={topFadeMaskStyle}
    >
      {/* Centered conversation column (ChatGPT-like reading width) */}
      <div className="mx-auto w-full max-w-3xl space-y-2">
        {messages.map((msg, index) => {
          const nextMsg = messages[index + 1];
          const isLastInGroup = !nextMsg || !nextMsg.isContinuation || nextMsg.role !== msg.role;

          // For assistant messages, compute the most recent user prompt so we can "regenerate"
          let retryText: string | null = null;
          if (msg.role === 'assistant') {
            for (let i = index - 1; i >= 0; i -= 1) {
              if (messages[i]?.role === 'user') {
                retryText = messages[i].content;
                break;
              }
            }
          }

          return (
            <div key={msg.id} className="flex flex-col">
              <MessageBubble
                message={msg}
                isLastInGroup={isLastInGroup}
                onCancelAppointment={onCancelAppointment}
                onRescheduleAppointment={onRescheduleAppointment}
                onCardSelect={onCardSelect}
                retryText={retryText}
                onRegenerate={onRegenerate}
                userDisplayName={userDisplayName}
                userImageUrl={userImageUrl}
              />
            </div>
          );
        })}

        {isLoading && !messages.some((m) => m.role === 'assistant' && m.isLoading && m.content.length > 0) && (
          <AgentThinkingBubble
            steps={thinkingSteps ?? []}
            activeAgents={activeAgents}
            isActive={true}
            elapsedSeconds={elapsedSeconds ?? 0}
          />
        )}
      </div>

      {/* Scroll-to-bottom pill: appears when the user scrolled up mid-chat */}
      {!isNearBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottomManually}
          aria-label="Scroll ke pesan terbaru"
          className="sticky bottom-4 ml-auto mr-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-ugm-blue-dark/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-ugm-blue-light/90"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Pesan baru
        </button>
      )}

      {/* Scroll anchor for auto-scroll */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
