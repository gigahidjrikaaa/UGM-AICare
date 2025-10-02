// src/components/features/chat/ChatWindow.tsx
import React from "react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

interface ChatWindowProps {
  messages: Message[];
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatWindow({
  messages,
  chatContainerRef,
}: ChatWindowProps) {
  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-transparent space-y-4 px-1 pb-4 pt-3 sm:px-3 md:px-5">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}


