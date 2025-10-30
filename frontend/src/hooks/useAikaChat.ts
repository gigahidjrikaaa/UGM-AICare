/**
 * useAikaChat Hook
 * 
 * Enhanced chat hook that integrates Aika Meta-Agent orchestration
 * with the existing chat functionality.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { useAika, type AikaMessage, type AikaMetadata } from './useAika';
import type { Message } from '@/types/chat';

interface UseAikaChatOptions {
  sessionId: string;
  showAgentActivity?: boolean;
  showRiskIndicators?: boolean;
}

export function useAikaChat({ sessionId, showAgentActivity = true, showRiskIndicators = true }: UseAikaChatOptions) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const lastConversationIdRef = useRef<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<AikaMetadata | null>(null);

  const {
    sendMessage: sendToAika,
    loading: aikaLoading,
    error: aikaError,
    getRiskLevelColor,
    getAgentDisplayName,
  } = useAika({
    showToasts: true,
    onAgentActivity: (agents) => {
      console.log('🤖 Aika consulted agents:', agents);
      setActiveAgents(agents);
    },
    onRiskDetected: (assessment) => {
      console.log('⚠️ Risk detected:', assessment);
    },
    onEscalation: (caseId) => {
      console.log('🚨 Case escalated:', caseId);
    },
  });

  /**
   * Initialize with greeting message
   */
  useEffect(() => {
    if (messages.length === 0) {
      const greetingId = uuidv4();
      const conversationId = uuidv4();
      lastConversationIdRef.current = conversationId;

      setMessages([
        {
          id: greetingId,
          role: 'assistant',
          content: 'Halo! Aku Aika, asisten AI untuk kesehatan mentalmu. Bagaimana kabarmu hari ini? 💙',
          timestamp: new Date(),
          session_id: sessionId,
          conversation_id: conversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  }, [sessionId, messages.length]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  /**
   * Send message to Aika
   */
  const handleSendMessage = useCallback(
    async (message?: string) => {
      const userMessageContent = (typeof message === 'string' ? message : inputValue).trim();
      if (!userMessageContent) return;
      if (isLoading || aikaLoading) return;

      const activeConversationId =
        messages.find((m) => m.conversation_id)?.conversation_id || 
        lastConversationIdRef.current || 
        uuidv4();
      lastConversationIdRef.current = activeConversationId;

      // Add user message
      const newUserMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: userMessageContent,
        timestamp: new Date(),
        session_id: sessionId,
        conversation_id: activeConversationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputValue('');
      setIsLoading(true);
      setActiveAgents([]); // Reset active agents

      try {
        // Prepare conversation history for Aika
        const historyForAika: AikaMessage[] = [...messages, newUserMessage]
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-10) // Last 10 messages
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.created_at,
          }));

        // Send to Aika Meta-Agent
        const aikaResponse = await sendToAika(
          userMessageContent,
          historyForAika,
          'user' // 'user' for students, can be 'counselor' or 'admin' based on user role
        );

        if (!aikaResponse) {
          throw new Error('Failed to get response from Aika');
        }

        // Store metadata for UI display
        setLastMetadata(aikaResponse.metadata);

        // Add assistant response
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: aikaResponse.response,
          timestamp: new Date(),
          session_id: sessionId,
          conversation_id: activeConversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Add Aika-specific metadata
          aikaMetadata: aikaResponse.metadata,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Aika chat error:', error);

        // Add error message
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
          timestamp: new Date(),
          session_id: sessionId,
          conversation_id: activeConversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isError: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setActiveAgents([]); // Clear active agents when done
      }
    },
    [
      inputValue,
      isLoading,
      aikaLoading,
      messages,
      sessionId,
      sendToAika,
    ]
  );

  /**
   * Clear chat history
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    lastConversationIdRef.current = null;
  }, []);

  return {
    messages,
    inputValue,
    isLoading: isLoading || aikaLoading,
    activeAgents,
    error: aikaError,
    lastMetadata,
    handleInputChange,
    handleSendMessage,
    clearMessages,
    getRiskLevelColor,
    getAgentDisplayName,
  };
}
