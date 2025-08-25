'use client';

import React from 'react';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { useLiveTalkStore } from '@/store/useLiveTalkStore';
import { useLiveTalk } from '@/hooks/useLiveTalk';
import SpectrogramBubble from '@/components/SpectrogramBubble';
import { BsMicFill } from 'react-icons/bs';

export default function ChatInterface({ model }: { model: string }) {
  const {
    messages,
    inputValue,
    isLoading,
    error,
    currentMode,
    availableModules,
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleStartModule,
  } = useChat({ model });

  const {
    isLiveTalkActive,
    isListening,
    isAikaSpeaking,
    toggleLiveTalk,
  } = useLiveTalkStore();

  // Pass the chat handler to the live talk hook
  useLiveTalk({ onTranscriptReceived: handleSendMessage, messages });

  return (
    <div className="flex flex-col h-full w-full">
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        chatContainerRef={chatContainerRef}
      />
      <div className="p-4 bg-gray-900">
        {isLiveTalkActive ? (
          <div className="flex justify-center items-center">
            <SpectrogramBubble isActive={isListening || isAikaSpeaking} />
            <button
              onClick={toggleLiveTalk}
              className="ml-4 p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              aria-label="Stop Live Talk"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <ChatInput
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onStartModule={handleStartModule}
              isLoading={isLoading}
              currentMode={currentMode}
              availableModules={availableModules}
            />
            <button
              onClick={toggleLiveTalk}
              className="ml-2 flex-shrink-0 p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-md"
              aria-label="Start Live Talk"
            >
              <BsMicFill size={20} />
            </button>
          </div>
        )}
      </div>
      {error && <div className="p-2 text-center text-red-500 text-xs">{error}</div>}
    </div>
  );
}
