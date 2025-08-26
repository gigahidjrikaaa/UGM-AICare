// src/hooks/useChatMessages.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@/types/chat';
import { splitLongMessage, countWords, calculateReadTimeMs } from '@/lib/textUtils';

const MAX_CHUNK_LENGTH = 350;
const MESSAGE_DELAY_MS = 300;

export function useChatMessages(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const addAssistantChunksSequentially = useCallback(async (
    responseContent: string,
    initialLoaderId: string,
    messageSessionId: string,
    messageConversationId: string
  ) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== initialLoaderId));

    const chunks = splitLongMessage(responseContent, MAX_CHUNK_LENGTH);
    const baseTimestamp = new Date();
    const assistantMessages: Message[] = chunks.map(chunkContent => ({
      id: uuidv4(),
      role: 'assistant' as const,
      content: chunkContent,
      timestamp: baseTimestamp,
      isLoading: false,
      session_id: messageSessionId,
      conversation_id: messageConversationId,
      created_at: baseTimestamp.toISOString(),
      updated_at: baseTimestamp.toISOString(),
    }));

    for (let i = 0; i < assistantMessages.length; i++) {
      const currentChunkMessage = assistantMessages[i];
      setMessages((prev) => [...prev, currentChunkMessage]);

      if (i < assistantMessages.length - 1) {
        const wordCount = countWords(currentChunkMessage.content);
        const delay = calculateReadTimeMs(wordCount, 180, MESSAGE_DELAY_MS);
        const chunkLoaderId = `chunk-loader-${i}`;
        setMessages((prev) => [
          ...prev,
          {
            id: chunkLoaderId,
            role: 'assistant' as const,
            content: '',
            timestamp: new Date(),
            isLoading: true,
            session_id: messageSessionId,
            conversation_id: messageConversationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]);
        await new Promise(resolve => setTimeout(resolve, delay));
        setMessages((prev) => prev.filter((msg) => msg.id !== chunkLoaderId));
      }
    }
  }, []);

  return { messages, setMessages, chatContainerRef, addAssistantChunksSequentially };
}
