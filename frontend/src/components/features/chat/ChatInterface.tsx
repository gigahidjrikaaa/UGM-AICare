'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  memoryNote?: string;
}

export default function ChatInterface({ model, setModel, modelOptions, memoryNote }: ChatInterfaceProps) {
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
    pendingMessages,
    cancelCurrent,
    interruptWithMessage,
    removePendingAt,
    movePending,
    mergeWindowMs,
    setMergeWindowMs,
  } = useChat({ model });
  const [queueOpen, setQueueOpen] = useState(false);
  const queueButtonRef = useRef<HTMLButtonElement | null>(null);
  const queuePanelRef = useRef<HTMLDivElement | null>(null);
  const queueItemRefs = useRef<HTMLButtonElement[]>([]);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const prevQueueLenRef = useRef<number>(0);
  const prevLoadingRef = useRef<boolean>(false);
  const interruptedRef = useRef<boolean>(false);
  const interruptAndFlag = (content: string) => { interruptedRef.current = true; interruptWithMessage(content); };
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [grabIndex, setGrabIndex] = useState<number | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!queueOpen) return;
    const handler = (e: MouseEvent) => {
      if (!queuePanelRef.current || !queueButtonRef.current) return;
      if (
        !queuePanelRef.current.contains(e.target as Node) &&
        !queueButtonRef.current.contains(e.target as Node)
      ) {
        setQueueOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [queueOpen]);

  // Live region announcements: queue size changes & interrupt events
  useEffect(() => {
    const region = liveRegionRef.current;
    if (!region) return;
    if (pendingMessages.length !== prevQueueLenRef.current) {
      const diff = pendingMessages.length - prevQueueLenRef.current;
      if (diff > 0) {
        region.textContent = `${diff} pesan ditambahkan. Total antrean ${pendingMessages.length}.`;
      } else if (diff < 0) {
        region.textContent = `Pesan diproses atau dihapus. Sisa ${pendingMessages.length}.`;
      }
      prevQueueLenRef.current = pendingMessages.length;
    }
  }, [pendingMessages]);

  useEffect(() => {
    const region = liveRegionRef.current;
    if (!region) return;
    if (prevLoadingRef.current && !isLoading) {
      if (interruptedRef.current) {
        region.textContent = 'Response interrupted.';
        interruptedRef.current = false;
      } else {
        region.textContent = 'Respons selesai.';
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  // ESC to close
  useEffect(() => {
    if (!queueOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQueueOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [queueOpen]);

  // Return focus to trigger when closing
  useEffect(() => {
    if (!queueOpen && queueButtonRef.current) {
      queueButtonRef.current.focus({ preventScroll: true });
    }
  }, [queueOpen]);

  // Focus first removable button when opened
  useEffect(() => {
    if (queueOpen) {
      requestAnimationFrame(() => {
        queueItemRefs.current[0]?.focus({ preventScroll: true });
      });
    }
  }, [queueOpen, pendingMessages]);

  // Keyboard navigation inside panel (ArrowUp/ArrowDown)
  useEffect(() => {
    if (!queueOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const items = queueItemRefs.current;
      if (!items.length) return;
      const activeIndex = items.findIndex(el => el === document.activeElement);
      let nextIndex = activeIndex;
      if (e.key === 'ArrowDown') nextIndex = (activeIndex + 1) % items.length;
      if (e.key === 'ArrowUp') nextIndex = (activeIndex - 1 + items.length) % items.length;
      if (nextIndex !== activeIndex) {
        e.preventDefault();
        items[nextIndex]?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [queueOpen]);

  const {
    isLiveTalkActive,
    isListening,
    isAikaSpeaking,
    spectrogramData,
    toggleLiveTalk,
  } = useLiveTalkStore();

  // Pass the chat handlers to the live talk hook
  useLiveTalk({
    onTranscriptReceived: handleSendMessage,
    onPartialTranscript: setLiveTranscript, // Pass the new handler
    messages,
  });

  return (
    <ToastProvider>
    <div className="flex flex-col h-full w-full">
      
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        chatContainerRef={chatContainerRef}
      />
      {/* aria-live region for assistive tech announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
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
          <div className="flex items-center w-full">
            <ChatInput
              isLiveTalkActive={isLiveTalkActive}
              toggleLiveTalk={toggleLiveTalk}
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onInterruptSend={() => interruptAndFlag(inputValue)}
              onStartModule={handleStartModule}
              isLoading={isLoading}
              currentMode={currentMode}
              availableModules={availableModules}
              model={model}
              setModel={setModel}
              modelOptions={modelOptions}
              memoryNote={memoryNote}
              mergeWindowMs={mergeWindowMs}
              setMergeWindowMs={setMergeWindowMs}
            />
            <div className="flex flex-col items-start ml-2 -mt-8 space-y-1 relative">
              <div className="flex items-center gap-1">
                {isLoading && (
                  <button
                    onClick={cancelCurrent}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/80 hover:bg-red-600 text-white shadow focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Batalkan respons yang sedang berjalan"
                  >
                    Batalkan
                  </button>
                )}
                {pendingMessages?.length > 0 && (
                  <button
                    ref={queueButtonRef}
                    className="text-[10px] rounded-full bg-ugm-gold text-ugm-blue px-2 py-0.5 shadow focus:outline-none focus:ring-2 focus:ring-ugm-gold/40"
                    aria-label={`Ada ${pendingMessages.length} pesan dalam antrean`}
                    aria-haspopup="dialog"
                    aria-expanded={queueOpen ? 'true' : 'false'}
                    aria-controls="queue-popover"
                    title="Klik untuk melihat pesan antrean"
                    onClick={() => setQueueOpen(o => !o)}
                  >
                    {pendingMessages.length} queued
                  </button>
                )}
              </div>
              {pendingMessages?.length > 0 && queueOpen && (
                <div
                  id="queue-popover"
                  ref={queuePanelRef}
                  className="animate-in fade-in zoom-in-95 absolute left-0 top-full mt-1 w-56 max-h-56 overflow-auto rounded-md border border-white/10 bg-slate-900/95 backdrop-blur p-2 shadow-xl space-y-1 z-50 text-xs focus:outline-none"
                  role="dialog"
                  aria-label="Daftar pesan antrean"
                  tabIndex={-1}
                >
                  <div role="list" aria-label="Antrean pesan">
                  {pendingMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={"group flex items-start gap-1 rounded p-1.5 outline-none " +
                        (dragOverIndex === idx ? 'bg-ugm-gold/20 border border-ugm-gold/40 ' : 'bg-white/5 hover:bg-white/10 ') +
                        (grabIndex === idx ? 'ring-2 ring-ugm-gold/60 cursor-grabbing' : '')}
                      role="listitem"
                      aria-label={`Pesan antrean posisi ${idx + 1}`}
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => { dragIndexRef.current = idx; e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== idx) setDragOverIndex(idx); }}
                      onDragLeave={(e) => { if ((e.target as HTMLElement).closest('[draggable]')) return; setDragOverIndex(null); }}
                      onDrop={(e) => { e.preventDefault(); const from = dragIndexRef.current; const to = idx; if (from != null && from !== to) movePending(from, to); dragIndexRef.current = null; setDragOverIndex(null); }}
                      onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Spacebar') { // grab / release
                          e.preventDefault();
                          if (grabIndex === idx) {
                            setGrabIndex(null);
                            if (liveRegionRef.current) { liveRegionRef.current.textContent = `Selesai memindahkan. Posisi akhir ${idx + 1}.`; }
                          } else {
                            setGrabIndex(idx);
                            if (liveRegionRef.current) { liveRegionRef.current.textContent = `Memindahkan pesan ${idx + 1}. Gunakan panah untuk geser.`; }
                          }
                        } else if (grabIndex === idx && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                          e.preventDefault();
                          const target = e.key === 'ArrowUp' ? Math.max(0, idx - 1) : Math.min(pendingMessages.length - 1, idx + 1);
                          if (target !== idx) {
                            movePending(idx, target);
                            setGrabIndex(target);
                            if (liveRegionRef.current) { liveRegionRef.current.textContent = `Dipindah ke posisi ${target + 1}.`; }
                            // focus will shift on next render
                          }
                        } else if (grabIndex === idx && (e.key === 'Escape' || e.key === 'Enter')) {
                          e.preventDefault();
                          setGrabIndex(null);
                          if (liveRegionRef.current) { liveRegionRef.current.textContent = 'Reorder selesai.'; }
                        }
                      }}
                    >
                      <div className="flex-1 whitespace-pre-wrap break-words leading-snug">{msg}</div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => movePending(idx, Math.max(0, idx-1))}
                          disabled={idx === 0}
                          className="text-white/50 disabled:opacity-30 hover:text-white leading-none text-[10px] px-1"
                          aria-label={`Naikkan pesan ${idx + 1}`}
                        >▲</button>
                        <button
                          onClick={() => movePending(idx, Math.min(pendingMessages.length-1, idx+1))}
                          disabled={idx === pendingMessages.length -1}
                          className="text-white/50 disabled:opacity-30 hover:text-white leading-none text-[10px] px-1"
                          aria-label={`Turunkan pesan ${idx + 1}`}
                        >▼</button>
                      </div>
                      <button
                        onClick={() => removePendingAt(idx)}
                        className="opacity-70 group-hover:opacity-100 text-white/70 hover:text-white px-1"
                        aria-label={`Hapus pesan antrean ke-${idx + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  </div>
                  {isLoading && (
                    <div className="pt-1 border-t border-white/10 mt-1">
                      <button
                        onClick={() => interruptAndFlag(pendingMessages[0])}
                        className="w-full text-left text-[11px] px-2 py-1 rounded bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90 font-medium"
                        aria-label="Hentikan respons berjalan dan kirim segera pesan pertama"
                      >
                        Interrupt & Send First
                      </button>
                    </div>
                  )}
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => setQueueOpen(false)}
                      className="text-[11px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10"
                      aria-label="Tutup daftar antrean"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
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
