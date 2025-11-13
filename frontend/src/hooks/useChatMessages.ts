// src/hooks/useChatMessages.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Appointment, InterventionPlan } from '@/types/chat';
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
    messageConversationId: string,
    appointment?: Appointment | null,
    interventionPlan?: InterventionPlan | null,
    agentActivity?: Message['agentActivity']
  ) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== initialLoaderId));

    const chunks = splitLongMessage(responseContent, MAX_CHUNK_LENGTH);
    const baseTimestamp = new Date();
    const assistantMessages: Message[] = chunks.map((chunkContent, index) => ({
      id: uuidv4(),
      role: 'assistant' as const,
      content: chunkContent,
      timestamp: baseTimestamp,
      isLoading: false,
      session_id: messageSessionId,
      conversation_id: messageConversationId,
      created_at: baseTimestamp.toISOString(),
      updated_at: baseTimestamp.toISOString(),
      // Add appointment, intervention_plan, and agentActivity only to the last message chunk
      ...(index === chunks.length - 1 && appointment ? { appointment } : {}),
      ...(index === chunks.length - 1 && interventionPlan ? { intervention_plan: interventionPlan } : {}),
      ...(index === chunks.length - 1 && agentActivity ? { agentActivity } : {}),
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

  const startStreamingAssistantMessage = useCallback((
    messageSessionId: string,
    messageConversationId: string,
  ) => {
    const streamMessageId = uuidv4();
    const timestamp = new Date();
    setMessages((prev) => [
      ...prev,
      {
        id: streamMessageId,
        role: 'assistant',
        content: '',
        timestamp,
        isLoading: true,
        session_id: messageSessionId,
        conversation_id: messageConversationId,
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
      },
    ]);
    return streamMessageId;
  }, []);

  const appendToStreamingAssistantMessage = useCallback((messageId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: (msg.content || '') + chunk,
              updated_at: new Date().toISOString(),
            }
          : msg,
      ),
    );
  }, []);

  const finalizeStreamingAssistantMessage = useCallback((messageId: string, finalContent?: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: typeof finalContent === 'string' ? finalContent : msg.content,
              isLoading: false,
              updated_at: new Date().toISOString(),
            }
          : msg,
      ),
    );
  }, []);

  const failStreamingAssistantMessage = useCallback((messageId: string, errorContent: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: errorContent,
              isLoading: false,
              updated_at: new Date().toISOString(),
            }
          : msg,
      ),
    );
  }, []);

  const removeMessageById = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const updateMessageToolIndicator = useCallback((messageId: string, toolIndicator: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              toolIndicator,
              updated_at: new Date().toISOString(),
            }
          : msg,
      ),
    );
  }, []);

  return {
    messages,
    setMessages,
    chatContainerRef,
    addAssistantChunksSequentially,
    startStreamingAssistantMessage,
    appendToStreamingAssistantMessage,
    finalizeStreamingAssistantMessage,
    failStreamingAssistantMessage,
    removeMessageById,
    updateMessageToolIndicator,
  };
}
