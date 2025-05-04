// src/components/features/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/TextArea'; // Corrected casing
import { SendHorizonal, BrainCircuit, X } from 'lucide-react'; // Using lucide-react icons
import { ChatMode, ChatModule } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onStartModule: (moduleId: string) => void;
  isLoading: boolean;
  currentMode: ChatMode;
  availableModules: ChatModule[];
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
  onStartModule,
  isLoading,
  currentMode,
  availableModules,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showModules, setShowModules] = useState(false);

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
      // Limit max height (e.g., to roughly 5 lines)
      const maxHeight = 120; // Adjust as needed (approx 5 * 24px line height)
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);


  const handleModuleClick = (moduleId: string) => {
      onStartModule(moduleId);
      setShowModules(false);
  }

  const isStandardMode = currentMode === 'standard';

  return (
    // Apply glassmorphism to the wrapper, including bottom rounding matching parent
    <div className="p-3 md:p-4 border-t border-white/10 bg-black/10 backdrop-blur-sm">
      {/* Module Selection Area - Apply similar glass style */}
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

      {/* Input Area */}
      <div className="flex items-end space-x-2">
        {/* Module Button - Glassy style */}
        <Button
            variant="outline"
            size="icon"
            onClick={() => setShowModules(!showModules)}
            disabled={isLoading || !isStandardMode}
            className={cn(
                "border-white/20 bg-white/10 text-ugm-gold hover:bg-white/20 flex-shrink-0", // Glassy button
                !isStandardMode && "opacity-50 cursor-not-allowed"
            )}
            title={isStandardMode ? (showModules ? "Tutup Pilihan" : "Pilih Latihan") : "Mode Latihan Aktif"}
            >
            {showModules ? <X className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
        </Button>

        {/* Textarea - Slightly opaque background for readability */}
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading ? "Aika sedang mengetik..." :
            isStandardMode ? "Ketik pesanmu di sini..." :
            "Ketik jawabanmu..."
          }
          rows={1}
          className={cn(
            "flex-1 resize-none overflow-y-auto max-h-28 h-fit", // Adjusted max height
            "bg-white/20 text-white placeholder:text-gray-300/80", // Semi-transparent bg
            "rounded-lg border border-white/10 focus:border-ugm-gold/50 focus:ring-ugm-gold/50" // Subtle border/focus
          )}
          disabled={isLoading}
          aria-label="Chat input"
        />
         {/* Send Button - Primary UGM colors */}
        <Button
          onClick={onSendMessage}
          disabled={isLoading || !inputValue.trim()}
          size="icon"
          className="flex-shrink-0 bg-ugm-gold text-ugm-blue hover:bg-ugm-gold/90 disabled:bg-ugm-gold/50" // Distinct Send button
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}