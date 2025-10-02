// src/components/features/chat/ChatInput.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/TextArea";
import {
  SendHorizonal,
  BrainCircuit,
  Plus,
  X as XIcon,
  Mic,
  Settings,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { ChatMode, AvailableModule as ChatModule } from "@/types/chat";
import { cn } from "@/lib/utils";
import SettingsModal from "./SettingsModal";
import ChatSettingsModal from "./ChatSettingsModal";
import { toast } from "react-hot-toast";

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
  onCancel?: () => void;
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
  onCancel,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showModules, setShowModules] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [interruptOnEnter, setInterruptOnEnter] = useState(true);

  const isStandardMode = currentMode === "standard";
  const actionIsCancel = isLoading && Boolean(onCancel);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 140;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [isLoading]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("aika_interrupt_on_enter");
      if (stored !== null) {
        setInterruptOnEnter(stored === "true");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("aika_interrupt_on_enter", String(interruptOnEnter));
    } catch {}
  }, [interruptOnEnter]);

  const handleModuleClick = (moduleId: string) => {
    if (isLoading) {
      toast.error("Tunggu sampai Aika selesai merespons sebelum memulai modul baru.");
      return;
    }
    onStartModule(moduleId);
    setShowModules(false);
  };

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    if (isLoading) {
      toast.error("Tunggu hingga Aika selesai merespons sebelum mengirim pesan baru.");
      return;
    }
    onSendMessage();
  }, [inputValue, isLoading, onSendMessage]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isLoading) {
        if (interruptOnEnter && onCancel) {
          onCancel();
        } else {
          toast.error("Aika masih merespons. Batalkan atau tunggu sebentar sebelum mengirim pesan baru.");
        }
        return;
      }
      handleSend();
    }
  };

  const handleActionClick = () => {
    if (actionIsCancel) {
      onCancel?.();
      return;
    }
    handleSend();
  };

  const ActionIcon = actionIsCancel ? XIcon : SendHorizonal;
  const actionLabel = actionIsCancel ? "Batalkan" : "Kirim";
  const actionDisabled = actionIsCancel ? false : !inputValue.trim();

  return (
    <div className="w-full flex-shrink-0">
      <div className="w-full rounded-3xl border border-white/12 bg-slate-900/70 p-4 shadow-[0_22px_50px_rgba(5,12,38,0.6)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4">
          {modelOptions?.length ? (
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/70">
              <div className="relative">
                <label htmlFor="chat-model" className="sr-only">
                  Model
                </label>
                <select
                  id="chat-model"
                  value={model}
                  onChange={(e) => setModel?.(e.target.value)}
                  className="peer appearance-none rounded-xl border border-white/15 bg-white/10 px-3 py-2 pr-9 text-xs text-white/90 transition focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 focus:border-ugm-gold/40 hover:bg-white/15"
                  aria-label="Pilih model AI"
                >
                  {modelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/60 transition peer-focus:text-ugm-gold" />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsChatSettingsOpen(true)}
                className="h-9 w-9 border-white/20 bg-white/10 text-white transition hover:bg-white/15"
                title="Pengaturan Chat"
                aria-label="Pengaturan Chat"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSettingsModalOpen(true)}
                className="h-9 w-9 border-white/20 bg-white/10 text-white transition hover:bg-white/15"
                title="Pengaturan Audio"
                aria-label="Pengaturan Audio"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div className="rounded-[36px] border border-white/10 bg-[#111d3e]/80 p-2 pl-3 shadow-inner">
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModules((prev) => !prev)}
                  disabled={isLoading || !isStandardMode}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60",
                    showModules && "bg-white/15"
                  )}
                  aria-label="Buka latihan terpandu"
                >
                  {showModules ? <BrainCircuit className="h-4 w-4 text-ugm-gold" /> : <Plus className="h-5 w-5" />}
                </button>

                <div className="flex-1 rounded-[28px] border border-white/10 bg-slate-900/60 px-4 py-3">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isLoading ? "Aika sedang mengetik..." : isStandardMode ? "Bagikan apa yang kamu rasakan atau tanyakan sesuatu." : "Ketik jawabanmu..."}
                    rows={1}
                    className="w-full resize-none bg-transparent text-sm text-white placeholder:text-white/45 focus-visible:outline-none focus-visible:ring-0 sm:text-base"
                  />
                  <div className="mt-2 flex justify-between text-[11px] text-white/45">
                    <span className="hidden sm:inline">Enter untuk {actionIsCancel ? "batalkan" : "kirim"}</span>
                    <span>Shift + Enter baris baru</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    onClick={toggleLiveTalk}
                    className={cn(
                      "h-12 w-12 rounded-full transition",
                      isLiveTalkActive
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90",
                      "disabled:bg-ugm-gold/50"
                    )}
                    aria-label={isLiveTalkActive ? "Stop Live Talk" : "Start Live Talk"}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={handleActionClick}
                    disabled={actionDisabled}
                    className={cn(
                      "flex h-12 min-w-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FFC857] via-[#ffb341] to-[#f9a602] text-[#061231] font-semibold transition hover:from-[#ffd36f] hover:via-[#ffbf52] hover:to-[#fbb933] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a602] sm:px-6",
                      actionIsCancel && "bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-400"
                    )}
                    aria-label={actionIsCancel ? "Batalkan respons" : "Kirim pesan"}
                  >
                    <ActionIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{actionLabel}</span>
                  </Button>
                </div>
              </div>

              {showModules && (
                <div className="rounded-2xl border border-white/12 bg-white/8 p-4 text-sm text-white/80 shadow-[inset_0_0_25px_rgba(12,22,60,0.35)]">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    <BrainCircuit className="h-4 w-4 text-ugm-gold" />
                    <span>Latihan yang tersedia</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableModules.map((mod) => (
                      <button
                        key={mod.id}
                        onClick={() => handleModuleClick(mod.id)}
                        disabled={isLoading}
                        className="group flex w-full flex-col rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-left transition hover:border-ugm-gold/40 hover:bg-slate-900/80 disabled:opacity-50"
                      >
                        <span className="text-sm font-semibold text-white group-hover:text-ugm-gold">{mod.name}</span>
                        <span className="text-[11px] text-white/60">{mod.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatSettingsModal
        isOpen={isChatSettingsOpen}
        onClose={() => setIsChatSettingsOpen(false)}
        interruptOnEnter={interruptOnEnter}
        onToggleInterrupt={setInterruptOnEnter}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}














