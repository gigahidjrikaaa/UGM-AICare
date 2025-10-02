'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
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

  const {
    isLiveTalkActive,
    isListening,
    isAikaSpeaking,
    spectrogramData,
    toggleLiveTalk,
    transcriptSegments,
  } = useLiveTalkStore();

  const [finalSegments, activePartial] = useMemo(() => {
    if (!transcriptSegments.length) {
      return [[], undefined] as const;
    }
    const lastSegment = transcriptSegments[transcriptSegments.length - 1];
    if (lastSegment && !lastSegment.final) {
      return [transcriptSegments.slice(0, -1), lastSegment] as const;
    }
    return [transcriptSegments, undefined] as const;
  }, [transcriptSegments]);

  useLiveTalk({
    onTranscriptReceived: handleSendMessage,
    onPartialTranscript: setLiveTranscript,
    messages,
  });

  const liveTalkStatus = useMemo(() => {
    if (isAikaSpeaking) {
      return {
        label: 'Aika sedang berbicara',
        dotClass: 'bg-ugm-gold animate-pulse',
        labelClass: 'text-ugm-gold/90',
      } as const;
    }
    if (isListening) {
      return {
        label: 'Mikrofon aktif mendengarkan...',
        dotClass: 'bg-emerald-400 animate-ping',
        labelClass: 'text-emerald-300',
      } as const;
    }
    return {
      label: 'Live Talk aktif',
      dotClass: 'bg-white/60',
      labelClass: 'text-white/70',
    } as const;
  }, [isAikaSpeaking, isListening]);

  return (
    <ToastProvider>
      <div className="flex h-full w-full flex-col gap-3 px-3 pb-3 pt-2 sm:px-4 md:px-6 lg:px-8">
        <ChatWindow messages={messages} isLoading={isLoading} chatContainerRef={chatContainerRef} />

        <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

        <div className="w-full flex-shrink-0">
          {isLiveTalkActive ? (
            <div className="flex flex-col items-center gap-5 border-t border-white/10 bg-slate-900/70 px-3 py-5 sm:rounded-3xl sm:px-5 md:px-8">
              <div className="flex flex-col items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
                <span className={`flex items-center gap-2 font-semibold ${liveTalkStatus.labelClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${liveTalkStatus.dotClass}`} />
                  {liveTalkStatus.label}
                </span>
              </div>

              <div className="w-full max-w-3xl space-y-3">
                {finalSegments.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {finalSegments.map((segment) => (
                      <span
                        key={segment.id}
                        className="rounded-xl bg-white/10 px-3 py-1 text-sm text-white shadow-sm shadow-black/20"
                      >
                        {segment.text}
                      </span>
                    ))}
                  </div>
                )}

                {activePartial ? (
                  <div className="rounded-2xl border border-ugm-gold/60 bg-ugm-gold/10 px-4 py-3 text-sm text-ugm-gold/95 shadow-[0_0_28px_rgba(255,197,64,0.16)]">
                    {activePartial.text}
                  </div>
                ) : (
                  <p className="text-center text-sm text-white/50">
                    Mulai berbicara dan kami akan menampilkan transkrip langsung di sini.
                  </p>
                )}
              </div>

              <div className="flex w-full max-w-3xl flex-col items-center gap-4 md:flex-row md:justify-between">
                <SpectrogramBubble isActive={isListening || isAikaSpeaking} data={spectrogramData} />
                <button
                  onClick={toggleLiveTalk}
                  className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300"
                  aria-label="Hentikan Live Talk"
                >
                  Hentikan Live Talk
                </button>
              </div>
            </div>
          ) : (
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
              onCancel={handleCancel}
            />
          )}
        </div>

        {error && <div className="p-2 text-center text-red-500 text-xs">{error}</div>}
      </div>
    </ToastProvider>
  );
}






