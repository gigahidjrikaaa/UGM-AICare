// src/components/features/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextArea';
import { SendHorizonal, BrainCircuit, X, Mic, Settings, ChevronDown, Info } from 'lucide-react';
import { ChatMode, AvailableModule as ChatModule } from '@/types/chat';
import { cn } from '@/lib/utils';
import SettingsModal from './SettingsModal';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
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
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
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
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const memoryBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryPlacement, setMemoryPlacement] = useState<'up' | 'down'>('up');
  // Close popover on outside click
  useEffect(() => {
    if (!memoryOpen) return;
    // Determine placement each time it opens or on resize/scroll
    const decidePlacement = () => {
      if (!memoryBtnRef.current) return;
      const triggerRect = memoryBtnRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const estimatedHeight = 220; // Approx popover height
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
        setMemoryPlacement('down');
      } else {
        setMemoryPlacement('up');
      }
    };
    decidePlacement();
    window.addEventListener('resize', decidePlacement);
    window.addEventListener('scroll', decidePlacement, true);
    return () => {
      window.removeEventListener('resize', decidePlacement);
      window.removeEventListener('scroll', decidePlacement, true);
    };
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
      event.preventDefault();
      if (inputValue.trim()) onSendMessage();
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

          <div className="flex items-center gap-2 ml-auto">
            {memoryNote && (
              <div className="relative" ref={popoverRef}>
                <button
                  ref={memoryBtnRef}
                  type="button"
                  onClick={() => setMemoryOpen(o => !o)}
                  aria-expanded={memoryOpen ? 'true' : 'false'}
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
                      'absolute right-0 z-[60] w-72 md:w-80 rounded-lg border border-white/15 bg-[#0d2f6b]/95 backdrop-blur-xl p-4 text-[11px] md:text-xs leading-relaxed text-white/70 shadow-2xl will-change-transform animate-in fade-in zoom-in-95',
                      memoryPlacement === 'up' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'
                    )}
                  >
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
            disabled={isLoading}
            aria-label="Chat input"
          />
        </div>

        <Button
          onClick={toggleLiveTalk}
          disabled={isLoading}
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
          onClick={onSendMessage}
          disabled={isLoading || !inputValue.trim()}
          size="icon"
          className="h-10 w-10 flex-shrink-0 bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90 disabled:bg-ugm-gold/50"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}