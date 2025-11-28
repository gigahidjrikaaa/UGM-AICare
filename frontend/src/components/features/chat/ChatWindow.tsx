// src/components/features/chat/ChatWindow.tsx
import React from "react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

import { AikaLoadingBubble } from "../aika/AikaLoadingBubble";

interface ChatWindowProps {
  messages: Message[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  onCancelAppointment?: (appointmentId: number, reason: string) => Promise<void>;
  onRescheduleAppointment?: (appointmentId: number, newDatetime: string) => Promise<void>;
  isLoading?: boolean;
  activeAgents?: string[];
}

export function ChatWindow({
  messages,
  chatContainerRef,
  onCancelAppointment,
  onRescheduleAppointment,
  isLoading,
  activeAgents = [],
}: ChatWindowProps) {
  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-transparent space-y-4 px-1 pb-4 pt-3 sm:px-3 md:px-5">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onCancelAppointment={onCancelAppointment}
          onRescheduleAppointment={onRescheduleAppointment}
        />
      ))}

      {/* Loading Indicator inside Chat Window */}
      {isLoading && (
        <div className="pl-0 sm:pl-2">
          <AikaLoadingBubble activeAgents={activeAgents} />
        </div>
      )}
    </div>
  );
}


