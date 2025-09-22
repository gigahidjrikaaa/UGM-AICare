// src/components/features/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextArea';
import { SendHorizonal, BrainCircuit, X, Mic, Settings, ChevronDown, Info, SlidersHorizontal } from 'lucide-react';
import { ChatMode, AvailableModule as ChatModule } from '@/types/chat';
import { cn } from '@/lib/utils';
import SettingsModal from './SettingsModal';
import { toast } from 'react-hot-toast';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onInterruptSend?: () => void;
  onStartModule: (moduleId: string) => void;
  isLoading: boolean;
  currentMode: ChatMode;
  availableModules: ChatModule[];
  isLiveTalkActive: boolean;
  toggleLiveTalk: () => void;
  model?: string;
  setModel?: (m: string) => void;
  modelOptions?: Array<{ value: string; label: string }>;
  memoryNote?: string;
  mergeWindowMs?: number;
  setMergeWindowMs?: (ms: number) => void;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
  onInterruptSend,
  onStartModule,
  isLoading,
  currentMode,
  availableModules,
  isLiveTalkActive,
  toggleLiveTalk,
  model,
  setModel,
  modelOptions,
  memoryNote,
  mergeWindowMs,
  setMergeWindowMs,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const memoryBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const behaviorBtnRef = useRef<HTMLButtonElement | null>(null);
  const behaviorPopoverRef = useRef<HTMLDivElement | null>(null);
  // Close popover on outside click
  useEffect(() => {
    if (!memoryOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && !memoryBtnRef.current?.contains(e.target as Node)) {
        setMemoryOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [memoryOpen]);

  // ESC to close
  useEffect(() => {
    if (!memoryOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMemoryOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [memoryOpen]);

  const [showModules, setShowModules] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const prevIsLoadingRef = useRef<boolean>(isLoading);
  const [interruptOnEnter, setInterruptOnEnter] = useState<boolean>(true);
  const [behaviorOpen, setBehaviorOpen] = useState(false);
  const [mergeWindowLocal, setMergeWindowLocal] = useState<number>(() => {
    if (typeof mergeWindowMs === 'number') return mergeWindowMs;
    try { const v = localStorage.getItem('aika_merge_window_ms'); if (v) return parseInt(v,10)||1200; } catch {} return 1200; });

  // Sync local when external prop changes
  useEffect(() => {
    if (typeof mergeWindowMs === 'number' && mergeWindowMs !== mergeWindowLocal) {
      setMergeWindowLocal(mergeWindowMs);
    }
  }, [mergeWindowMs, mergeWindowLocal]);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aika_interrupt_on_enter');
      if (stored) setInterruptOnEnter(stored === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('aika_interrupt_on_enter', String(interruptOnEnter)); } catch {}
  }, [interruptOnEnter]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (!inputValue.trim()) return;
      // Alt+Enter while streaming => queue (normal send) instead of interrupt
      if (event.altKey && isLoading) {
        event.preventDefault();
        onSendMessage();
        return;
      }
      event.preventDefault();
      if (isLoading && onInterruptSend && interruptOnEnter) {
        setPulse(true);
        onInterruptSend();
        setTimeout(() => setPulse(false), 400);
      } else if (!isLoading) {
        onSendMessage();
      } else if (isLoading && !interruptOnEnter) {
        // Queue instead of interrupt
        onSendMessage();
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading && !inputValue && textareaRef.current) {
      textareaRef.current.focus();
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, inputValue]);

  const handleModuleClick = (moduleId: string) => {
    onStartModule(moduleId);
    setShowModules(false);
  };

  // Restore focus to memory trigger when popover closes (for keyboard users)
  useEffect(() => {
    if (!memoryOpen && memoryBtnRef.current) {
      const active = document.activeElement as HTMLElement | null;
      const withinPopover = active && (popoverRef.current?.contains(active) || popoverRef.current === active);
      if (!withinPopover && document.hasFocus()) {
        memoryBtnRef.current.focus({ preventScroll: true });
      }
    }
  }, [memoryOpen]);

  const isStandardMode = currentMode === 'standard';

  // Close behavior popover on outside click
  useEffect(() => {
    if (!behaviorOpen) return;
    const handler = (e: MouseEvent) => {
      if (behaviorPopoverRef.current && !behaviorPopoverRef.current.contains(e.target as Node)) {
        setBehaviorOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [behaviorOpen]);

  // ESC to close behavior popover
  useEffect(() => {
    if (!behaviorOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setBehaviorOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [behaviorOpen]);

  // Restore focus to trigger after closing behavior popover
  useEffect(() => {
    if (!behaviorOpen && behaviorBtnRef.current) {
      const active = document.activeElement as HTMLElement | null;
      const withinPopover = active && (behaviorPopoverRef.current?.contains(active) || behaviorPopoverRef.current === active);
      if (!withinPopover && document.hasFocus()) {
        behaviorBtnRef.current.focus({ preventScroll: true });
      }
    }
  }, [behaviorOpen]);

  return (
    <div className="w-full border-t border-white/10 bg-gradient-to-b from-black/30 to-black/50 backdrop-blur-xl px-3 py-3 md:px-4 md:py-4 space-y-3">
      {/* Meta Toolbar */}
      {(modelOptions?.length || memoryNote || true) && (
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {modelOptions?.length ? (
            <div className="flex items-center gap-2">
              <label htmlFor="chat-model" className="sr-only">Model</label>
              <div className="relative">
                <select
                  id="chat-model"
                  value={model}
                  onChange={(e) => setModel?.(e.target.value)}
                  className="appearance-none pr-8 text-xs md:text-sm rounded-md bg-white/10 border border-white/15 text-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 focus:border-ugm-gold/40 hover:bg-white/15 transition"
                  aria-label="Pilih model AI"
                >
                  {modelOptions.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 ml-auto relative">
            <div className="relative" ref={behaviorPopoverRef}>
              <Button
                ref={behaviorBtnRef}
                variant="outline"
                size="icon"
                onClick={() => setBehaviorOpen(o => !o)}
                className={cn(
                  "h-8 w-8 border-white/15 bg-white/5 hover:bg-white/15 text-white",
                  behaviorOpen && "ring-2 ring-ugm-gold/50"
                )}
                title="Behavior Settings"
                aria-label="Behavior Settings"
                aria-expanded={behaviorOpen}
                aria-controls="behavior-popover"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              {behaviorOpen && (
                <div
                  id="behavior-popover"
                  role="dialog"
                  aria-label="Pengaturan perilaku chat"
                  className="absolute z-[65] left-1/2 top-full mt-2 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-900/90 backdrop-blur-xl p-4 pb-4 text-white shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 focus:outline-none"
                >
                  <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rotate-45 rounded-sm border border-white/15 bg-slate-900/95" />
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <h2 className="text-[11px] font-semibold tracking-wide text-ugm-gold">Pengaturan Perilaku</h2>
                    <button
                      onClick={() => setBehaviorOpen(false)}
                      aria-label="Tutup"
                      className="text-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 rounded"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-5 text-[11px] md:text-xs">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-ugm-gold"
                          checked={interruptOnEnter}
                          onChange={(e) => setInterruptOnEnter(e.target.checked)}
                          aria-label="Aktifkan interrupt saat tekan Enter"
                        />
                        Interrupt saat Enter (Alt+Enter untuk antre)
                      </label>
                      <p className="text-white/40 leading-snug">Jika aktif, menekan Enter ketika Aika merespons akan menghentikan streaming dan mengirim pesan segera.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium flex items-center justify-between">
                        Window Penggabungan (ms)
                        <input
                          type="number"
                          min={200}
                          max={8000}
                          step={100}
                          value={mergeWindowLocal}
                          onChange={e => setMergeWindowLocal(Math.min(8000, Math.max(200, parseInt(e.target.value||'0',10))))}
                          className="w-24 bg-white/10 border border-white/15 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:ring-2 focus:ring-ugm-gold/40"
                          aria-label="Durasi window penggabungan dalam milidetik"
                        />
                      </label>
                      <input
                        type="range"
                        min={200}
                        max={8000}
                        step={100}
                        value={mergeWindowLocal}
                        onChange={e => setMergeWindowLocal(parseInt(e.target.value,10))}
                        aria-label="Slider window penggabungan"
                        className="w-full accent-ugm-gold"
                      />
                      <p className="text-white/40 leading-snug">Pesan cepat yang dikirim dalam jendela ini akan digabung dan dikirim berurutan setelah streaming selesai atau saat flush timer.</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => { setMergeWindowLocal(1200); }} className="border-white/20 text-white/70 hover:text-white">Reset</Button>
                    <Button variant="outline" size="sm" onClick={() => { setBehaviorOpen(false); }} className="border-white/20 text-white/70 hover:text-white">Batal</Button>
                    <Button size="sm" onClick={() => { try { localStorage.setItem('aika_merge_window_ms', String(mergeWindowLocal)); } catch {}; setMergeWindowMs?.(mergeWindowLocal); setBehaviorOpen(false); toast.success('Pengaturan disimpan'); }} className="bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90 focus:ring-2 focus:ring-ugm-gold/40">Simpan</Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSettingsModalOpen((prev) => !prev)}
                className="h-8 w-8 border-white/15 bg-white/5 hover:bg-white/15 text-white"
                title="Audio Settings"
                aria-label="Audio Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {showModules && (
        <div className="p-3 border border-white/10 rounded-lg bg-black/30 backdrop-blur-sm shadow-inner max-h-44 overflow-y-auto">
          <h4 className="text-xs font-semibold tracking-wide text-ugm-gold mb-2">Latihan</h4>
          <ul className="space-y-1">
            {availableModules.map((mod) => (
              <li key={mod.id}>
                <button
                  onClick={() => handleModuleClick(mod.id)}
                  disabled={isLoading}
                  className="w-full text-left px-2 py-2 rounded-md hover:bg-white/10 disabled:opacity-50 text-xs md:text-sm text-white transition"
                >
                  <span className="font-medium">{mod.name}</span>
                  <p className="text-[10px] md:text-xs text-gray-300 mt-0.5 line-clamp-2">{mod.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Input Row */}
      <div className="flex items-end gap-2 md:gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowModules(!showModules)}
          disabled={isLoading || !isStandardMode}
          className={cn(
            "h-10 w-10 border-white/15 bg-white/5 hover:bg-white/15 text-ugm-gold flex-shrink-0",
            !isStandardMode && "opacity-50 cursor-not-allowed"
          )}
          title={isStandardMode ? (showModules ? "Tutup Pilihan" : "Pilih Latihan") : "Mode Latihan Aktif"}
          aria-label={isStandardMode ? (showModules ? "Tutup pilihan latihan" : "Pilih latihan") : "Mode latihan aktif"}
        >
          {showModules ? <X className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
        </Button>

        {memoryNote && (
          <div className="relative" ref={popoverRef}>
            <button
              ref={memoryBtnRef}
              type="button"
              onClick={() => setMemoryOpen(o => !o)}
              aria-expanded={memoryOpen}
              aria-controls="memory-popover"
              className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-medium text-white/80 hover:text-white bg-white/5 border border-white/10 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ugm-gold/50 transition"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Memori</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${memoryOpen ? 'rotate-180' : ''}`} />
            </button>
            {memoryOpen && (
              <div
                id="memory-popover"
                role="dialog"
                aria-label="Penjelasan memori"
                className={cn(
                  'absolute left-0 top-full mt-2 z-[60] w-72 md:w-80 rounded-lg border border-white/15 bg-[#0d2f6b]/95 backdrop-blur-xl p-4 pt-5 text-[11px] md:text-xs leading-relaxed text-white/70 shadow-2xl will-change-transform',
                  'animate-in fade-in slide-in-from-top-2'
                )}
              >
                <span
                  aria-hidden="true"
                  className='pointer-events-none absolute left-6 -top-1.5 h-3 w-3 rotate-45 rounded-sm border border-white/15 bg-[#0d2f6b]/95 backdrop-blur'
                />
                <p className="font-semibold text-white mb-1 text-xs">Mengapa Aika mengingatmu?</p>
                <p>{memoryNote}</p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMemoryOpen(false)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15 focus:outline-none focus:ring-2 focus:ring-ugm-gold/40"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0 relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Aika sedang mengetik..." : isStandardMode ? "Ketik pesanmu di sini..." : "Ketik jawabanmu..."}
            rows={1}
            className={cn(
              "flex-1 resize-none overflow-y-auto max-h-32 h-fit w-full",
              "bg-white/10 text-white placeholder:text-white/40",
              "rounded-md border border-white/15 focus:border-ugm-gold/50 focus:ring-ugm-gold/40 focus:ring-2 px-3 py-2 text-sm md:text-base",
              "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
            )}
            disabled={false}
            aria-label="Chat input"
          />
        </div>

        <Button
          onClick={toggleLiveTalk}
          disabled={false}
          size="icon"
          className={cn(
            "h-10 w-10 flex-shrink-0",
            isLiveTalkActive ? "bg-red-500 text-white hover:bg-red-600" : "bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90",
            "disabled:bg-ugm-gold/50"
          )}
          aria-label={isLiveTalkActive ? "Stop Live Talk" : "Start Live Talk"}
        >
          <Mic className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => {
            if (isLoading && onInterruptSend && interruptOnEnter) {
              setPulse(true);
              onInterruptSend();
              setTimeout(() => setPulse(false), 400);
            } else {
              onSendMessage();
            }
          }}
          disabled={!inputValue.trim()}
          size="icon"
          className={`h-10 w-10 flex-shrink-0 bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90 disabled:bg-ugm-gold/50 relative ${pulse ? 'animate-pulse ring-2 ring-ugm-gold/60 ring-offset-2 ring-offset-slate-800' : ''}`}
          aria-label={isLoading ? (interruptOnEnter ? "Interrupt dan kirim" : "Antrekan pesan") : "Kirim pesan"}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
      {/* Behavior popover outside overlay removed */}
    </div>
  );
}