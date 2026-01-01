/**
 * useAikaChat Hook
 * 
 * Enhanced chat hook that integrates Aika Meta-Agent orchestration
 * with the existing chat functionality.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import { useAika, type AikaMessage, type AikaMetadata, type ToolEvent } from './useAika';
import type { Message } from '@/types/chat';

// Activity log entry type for tool/API tracking
export interface ToolActivityLog {
  id: string;
  type: 'tool_start' | 'tool_end' | 'tool_use' | 'status';
  tool?: string;
  tools?: string[];
  message?: string;
  timestamp: string;
}

interface UseAikaChatOptions {
  sessionId: string;
  showAgentActivity?: boolean;
  showRiskIndicators?: boolean;
  preferredModel?: string;
  onToolActivity?: (activity: ToolActivityLog) => void;
}

export function useAikaChat({ 
  sessionId, 
  showAgentActivity = true, 
  showRiskIndicators = true,
  preferredModel,
  onToolActivity 
}: UseAikaChatOptions) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const lastConversationIdRef = useRef<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<AikaMetadata | null>(null);

  // Track streaming state for multi-bubble support
  const streamingBufferRef = useRef<string>('');
  const currentBubbleIdRef = useRef<string | null>(null);
  const bubbleCountRef = useRef<number>(0);

  /**
   * Split content into logical sections for multiple message bubbles.
   * This creates a more natural, conversational feel.
   */
  const splitContentIntoSections = (content: string): string[] => {
    const sections: string[] = [];
    
    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n');
    
    // Multiple patterns to detect section breaks:
    // 1. Double newline followed by bold header: **Header** or **Header:**
    // 2. Double newline followed by heading: ## Header or ### Header
    // 3. Double newline followed by numbered list item that looks like a section: 1. **Item**
    const sectionPatterns = [
      /\n\n(?=\*\*[^*\n]+\*\*:?\s*\n)/g,  // **Bold Header** or **Bold Header:**
      /\n\n(?=##+ )/g,                      // Markdown headings
      /\n\n(?=\d+\.\s+\*\*)/g,              // Numbered items with bold
    ];
    
    // Try splitting with each pattern
    let parts = [normalizedContent];
    for (const pattern of sectionPatterns) {
      if (parts.length === 1) {
        const split = parts[0].split(pattern);
        if (split.length > 1) {
          parts = split;
          break;
        }
      }
    }
    
    // If still no split occurred, try splitting by double newlines for very long content
    if (parts.length === 1 && normalizedContent.length > 400) {
      // Split on double newlines, but keep related content together
      const paragraphs = normalizedContent.split(/\n\n+/);
      let currentChunk = '';
      
      for (const para of paragraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;
        
        // Check if this paragraph is a header/title (bold text at start)
        const isHeader = /^\*\*[^*]+\*\*/.test(trimmedPara) || /^##+ /.test(trimmedPara);
        
        // Start a new section if:
        // 1. Current chunk is getting long (>350 chars) and this is a header
        // 2. Current chunk is very long (>500 chars)
        if ((currentChunk.length > 350 && isHeader) || currentChunk.length > 500) {
          if (currentChunk.trim()) {
            sections.push(currentChunk.trim());
          }
          currentChunk = trimmedPara;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
        }
      }
      
      if (currentChunk.trim()) {
        sections.push(currentChunk.trim());
      }
    } else {
      // Process the parts from pattern splitting
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          sections.push(trimmed);
        }
      }
    }
    
    // If no splitting occurred, return original content
    return sections.length > 0 ? sections : [normalizedContent];
  };

  // Simplified streaming - just accumulate content in a single bubble during streaming
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
    onToolEvent: (event) => {
      // Forward tool events to parent component for activity logging
      if (onToolActivity) {
        onToolActivity({
          id: uuidv4(),
          type: event.type,
          tool: event.tool,
          tools: event.tools,
          timestamp: event.timestamp,
        });
      }
    },
    onStatusUpdate: (message) => {
      // Forward status updates as activity logs
      if (onToolActivity) {
        onToolActivity({
          id: uuidv4(),
          type: 'status',
          message: message,
          timestamp: new Date().toISOString(),
        });
      }
    },
    onPartialResponse: (text) => {
      setIsLoading(false);
      
      // Simple streaming: just accumulate in a single bubble
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: m.content + text } : m
          );
        } else {
          const newMessage: Message = {
            id: `streaming-${Date.now()}`,
            role: 'assistant',
            content: text,
            timestamp: new Date(),
            session_id: sessionId,
            conversation_id: lastConversationIdRef.current || uuidv4(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            isStreaming: true,
            isLoading: false,
          };
          return [...prev, newMessage];
        }
      });
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
          'user', // 'user' for students, can be 'counselor' or 'admin' based on user role
          preferredModel
        );

        if (!aikaResponse) {
          throw new Error('Failed to get response from Aika');
        }

        // Store metadata for UI display
        setLastMetadata(aikaResponse.metadata);

        // Reset bubble tracking
        bubbleCountRef.current = 0;
        currentBubbleIdRef.current = null;

        // Update or Add assistant response - split into multiple bubbles
        setMessages((prev) => {
          const streamingMsgIndex = prev.findIndex(m => m.isStreaming);
          
          if (streamingMsgIndex !== -1) {
            // Get the streamed content and split it into sections
            const streamedContent = prev[streamingMsgIndex].content;
            const sections = splitContentIntoSections(streamedContent);
            
            // Remove the streaming message and add split messages
            const beforeStreaming = prev.slice(0, streamingMsgIndex);
            const afterStreaming = prev.slice(streamingMsgIndex + 1);
            
            const newMessages: Message[] = sections.map((section, idx) => ({
              id: uuidv4(),
              role: 'assistant' as const,
              content: section,
              timestamp: new Date(),
              session_id: sessionId,
              conversation_id: activeConversationId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              isStreaming: false,
              isContinuation: idx > 0, // Mark all but first as continuation
              aikaMetadata: idx === sections.length - 1 ? aikaResponse.metadata : undefined, // Only last gets metadata
            }));
            
            return [...beforeStreaming, ...newMessages, ...afterStreaming];
          } else {
            // No streaming happened, split the full response
            const sections = splitContentIntoSections(aikaResponse.response);
            
            const newMessages: Message[] = sections.map((section, idx) => ({
              id: uuidv4(),
              role: 'assistant' as const,
              content: section,
              timestamp: new Date(),
              session_id: sessionId,
              conversation_id: activeConversationId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              isContinuation: idx > 0,
              aikaMetadata: idx === sections.length - 1 ? aikaResponse.metadata : undefined,
            }));
            
            return [...prev, ...newMessages];
          }
        });
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
      preferredModel,
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
