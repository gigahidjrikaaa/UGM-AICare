// src/components/features/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextArea';
import { SendHorizonal, BrainCircuit, X, Mic, Settings } from 'lucide-react';
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
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const isStandardMode = currentMode === 'standard';

  return (
    <div className="w-full p-3 md:p-4 border-t border-white/10 bg-black/10 backdrop-blur-sm">
      {showModules && (
        <div className="mb-3 p-3 border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm shadow-md max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold text-ugm-gold mb-2">Pilih Latihan:</h4>
          <ul className="space-y-1">
            {availableModules.map((mod) => (
              <li key={mod.id}>
                <button
                  onClick={() => handleModuleClick(mod.id)}
                  disabled={isLoading}
                  className="w-full text-left p-2 rounded hover:bg-white/10 disabled:opacity-50 text-sm text-white"
                >
                  <span className="font-medium">{mod.name}</span>
                  <p className="text-xs text-gray-300">{mod.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative flex justify-end mb-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSettingsModalOpen((prev) => !prev)} // Toggle visibility
          className="border-white/20 bg-white/10 text-white hover:bg-white/20 h-8 w-8"
          title="Audio Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      </div>

      <div className="flex items-end space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowModules(!showModules)}
          disabled={isLoading || !isStandardMode}
          className={cn(
            "border-white/20 bg-white/10 text-ugm-gold hover:bg-white/20 flex-shrink-0",
            !isStandardMode && "opacity-50 cursor-not-allowed"
          )}
          title={isStandardMode ? (showModules ? "Tutup Pilihan" : "Pilih Latihan") : "Mode Latihan Aktif"}
        >
          {showModules ? <X className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
        </Button>

        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Aika sedang mengetik..." : isStandardMode ? "Ketik pesanmu di sini..." : "Ketik jawabanmu..."}
          rows={1}
          className={cn(
            "flex-1 resize-none overflow-y-auto max-h-28 h-fit",
            "bg-white/20 text-white placeholder:text-gray-300/80",
            "rounded-lg border border-white/10 focus:border-ugm-gold/50 focus:ring-ugm-gold/50"
          )}
          disabled={isLoading}
          aria-label="Chat input"
        />

        <Button
          onClick={toggleLiveTalk}
          disabled={isLoading}
          size="icon"
          className={cn(
            "flex-shrink-0",
            isLiveTalkActive ? "bg-red-500 text-white" : "bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90",
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
          className="flex-shrink-0 bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90 disabled:bg-ugm-gold/50"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}