// src/components/features/chat/ChatWindow.tsx
import React from 'react';
import { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement | null>; // Ref for the chat container
}

export function ChatWindow({ messages, chatContainerRef }: ChatWindowProps) {
  return (
    <div
      ref={chatContainerRef}
      // Make background transparent, adjust padding, remove border/rounding here
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent"
      // Remove max-height style here, let parent control height
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}