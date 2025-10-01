'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { useLiveTalkStore } from '@/store/useLiveTalkStore';
import { useLiveTalk } from '@/hooks/useLiveTalk';
import SpectrogramBubble from '@/components/SpectrogramBubble';
import { ToastProvider } from '@/components/ui/toast/ToastProvider';

interface ChatInterfaceProps {
  model: string;
  setModel?: (m: string) => void;
  modelOptions?: Array<{ value: string; label: string }>;
}

export default function ChatInterface({ model, setModel, modelOptions }: ChatInterfaceProps) {
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
    cancelCurrent,
  } = useChat({ model });

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const prevLoadingRef = useRef<boolean>(false);
  const interruptedRef = useRef<boolean>(false);

  const handleCancel = useCallback(() => {
    interruptedRef.current = true;
    cancelCurrent();
  }, [cancelCurrent]);

  useEffect(() => {
    const region = liveRegionRef.current;
    if (!region) return;

    if (!prevLoadingRef.current && isLoading) {
      region.textContent = 'Aika sedang merespons.';
    }

    if (prevLoadingRef.current && !isLoading) {
      if (interruptedRef.current) {
        region.textContent = 'Respons dibatalkan.';
        interruptedRef.current = false;
      } else {
        region.textContent = 'Respons selesai.';
      }
    }

    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  const { isLiveTalkActive, isListening, isAikaSpeaking, spectrogramData, toggleLiveTalk } = useLiveTalkStore();

  useLiveTalk({
    onTranscriptReceived: handleSendMessage,
    onPartialTranscript: setLiveTranscript,
    messages,
  });

  return (
    <ToastProvider>
      <div className="flex flex-col h-full w-full">
        <ChatWindow messages={messages} isLoading={isLoading} chatContainerRef={chatContainerRef} />

        <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

        <div className="bg-gray-900">
          {isLiveTalkActive ? (
            <div className="flex flex-col justify-center items-center p-4 min-h-[120px]">
              <div className="h-6 text-sm text-gray-400 mb-2">
                {isAikaSpeaking && <span className="animate-pulse">Aika is speaking...</span>}
                {!isAikaSpeaking && isListening && <span className="animate-pulse">Listening...</span>}
              </div>
              <div className="w-full max-w-md text-center text-white mb-3 px-4 min-h-[28px]">{inputValue}</div>
              <div className="flex items-center">
                <SpectrogramBubble isActive={isListening || isAikaSpeaking} data={spectrogramData} />
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
            <div className="flex items-start w-full gap-3 p-3 md:p-4">
              <div className="flex-1">
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
                  model={model}
                  setModel={setModel}
                  modelOptions={modelOptions}
                />
              </div>
              <div className="flex flex-col items-start justify-start space-y-2 pt-2 min-w-[120px]">
                <span className="text-[11px] text-white/60">
                  {isLoading ? 'Aika sedang merespons...' : 'Kirim pesan saat siap.'}
                </span>
                {isLoading && (
                  <button
                    onClick={handleCancel}
                    className="text-[11px] px-3 py-1.5 rounded bg-red-500/80 hover:bg-red-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Batalkan respons yang sedang berjalan"
                  >
                    Batalkan
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <div className="p-2 text-center text-red-500 text-xs">{error}</div>}
      </div>
    </ToastProvider>
  );
}
