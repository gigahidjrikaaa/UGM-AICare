'use client';

import React from 'react';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { useLiveTalkStore } from '@/store/useLiveTalkStore';
import { useLiveTalk } from '@/hooks/useLiveTalk';
import SpectrogramBubble from '@/components/SpectrogramBubble';


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
    setLiveTranscript,
  } = useChat({ model });

  const {
    isLiveTalkActive,
    isListening,
    isAikaSpeaking,
    toggleLiveTalk,
  } = useLiveTalkStore();

  // Pass the chat handlers to the live talk hook
  useLiveTalk({
    onTranscriptReceived: handleSendMessage,
    onPartialTranscript: setLiveTranscript, // Pass the new handler
    messages,
  });

  return (
    <div className="flex flex-col h-full w-full">
      
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        chatContainerRef={chatContainerRef}
      />
      <div className="bg-gray-900">
        {isLiveTalkActive ? (
          <div className="flex flex-col justify-center items-center p-4 min-h-[120px]">
            <div className="h-6 text-sm text-gray-400 mb-2">
              {isAikaSpeaking && (
                <span className="animate-pulse">Aika is speaking...</span>
              )}
              {!isAikaSpeaking && isListening && (
                <span className="animate-pulse">Listening...</span>
              )}
            </div>
            {/* Display live transcript */}
            <div className="w-full max-w-md text-center text-white mb-3 px-4 min-h-[28px]">
              {inputValue}
            </div>
            <div className="flex items-center">
              <SpectrogramBubble isActive={isListening || isAikaSpeaking} />
              <button
                onClick={toggleLiveTalk}
                className="ml-4 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                aria-label="Stop Live Talk"
              >
                Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center w-full">
            <ChatInput
              isLiveTalkActive={isLiveTalkActive}
              toggleLiveTalk={toggleLiveTalk}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onStartModule={handleStartModule}
              isLoading={isLoading}
              currentMode={currentMode}
              availableModules={availableModules}
            />
          </div>
        )}
      </div>
      {error && <div className="p-2 text-center text-red-500 text-xs">{error}</div>}
    </div>
  );
}
