// src/components/features/chat/ChatInterface.tsx
// This component now encapsulates the chat logic using the useChat hook.
'use client';

import React from 'react';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat'; // Import the custom hook

export default function ChatInterface({ model }: { model: string }) {
  const {
    messages,
    inputValue,
    isLoading,
    error, // You can display this error if needed
    currentMode,
    availableModules,
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleStartModule,
    // sessionId, // Get sessionId from the hook if needed elsewhere (e.g., feedback)
  } = useChat({ model });

  return (
    // This outer div fills the container provided by the page
    <div className="flex flex-col h-full w-full">
      {/* Chat Window takes up remaining space */}
      <ChatWindow
        messages={messages}
        isLoading={isLoading} // Pass loading state if needed for window-level indicators
        chatContainerRef={chatContainerRef}
      />
      {/* Chat Input at the bottom */}
      <ChatInput
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onStartModule={handleStartModule}
        isLoading={isLoading}
        currentMode={currentMode}
        availableModules={availableModules}
      />
      {/* Optional: Display general errors here */}
      {error && <div className="p-2 text-center text-red-500 text-xs">{error}</div>}
    </div>
  );
}