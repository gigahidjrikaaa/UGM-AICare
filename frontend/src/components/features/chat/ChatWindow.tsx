// src/components/features/chat/ChatWindow.tsx
import React from "react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

import { AikaLoadingBubble } from "../aika/AikaLoadingBubble";

import CounselorCard from "./CounselorCard";
import TimeSlotCard from "./TimeSlotCard";

interface ChatWindowProps {
  messages: Message[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  onCancelAppointment?: (appointmentId: number, reason: string) => Promise<void>;
  onRescheduleAppointment?: (appointmentId: number, newDatetime: string) => Promise<void>;
  isLoading?: boolean;
  activeAgents?: string[];
  onCardSelect?: (text: string) => void;
}

export function ChatWindow({
  messages,
  chatContainerRef,
  onCancelAppointment,
  onRescheduleAppointment,
  isLoading,
  activeAgents = [],
  onCardSelect,
}: ChatWindowProps) {
  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-transparent space-y-4 px-1 pb-4 pt-3 sm:px-3 md:px-5">
      {messages.map((msg) => (
        <div key={msg.id} className="flex flex-col">
          <MessageBubble
            message={msg}
            onCancelAppointment={onCancelAppointment}
            onRescheduleAppointment={onRescheduleAppointment}
          />

          {/* Render Interactive Cards based on Tool Calls */}
          {msg.role === 'assistant' && msg.metadata?.tool_calls && Array.isArray(msg.metadata.tool_calls) && (
            <div className="mt-2 w-full overflow-x-auto pb-2 custom-scrollbar pl-10">
              <div className="flex gap-3 px-1">
                {msg.metadata.tool_calls.map((tool: any, idx: number) => {
                  // Check for get_available_counselors result
                  if (tool.tool_name === 'get_available_counselors' && tool.result?.counselors) {
                    return tool.result.counselors.map((counselor: any) => (
                      <CounselorCard
                        key={counselor.id}
                        counselor={counselor}
                        onSelect={(c) => onCardSelect?.(`Saya pilih ${c.name} (ID: ${c.id})`)}
                      />
                    ));
                  }
                  // Check for suggest_appointment_times result
                  if (tool.tool_name === 'suggest_appointment_times' && tool.result?.suggestions) {
                    return tool.result.suggestions.map((slot: any, sIdx: number) => (
                      <TimeSlotCard
                        key={sIdx}
                        slot={slot}
                        onSelect={(s) => onCardSelect?.(`Saya pilih waktu ${s.time_label} (${s.datetime})`)}
                      />
                    ));
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
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


