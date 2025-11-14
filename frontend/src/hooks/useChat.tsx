// src/hooks/useChat.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useGreeting } from './useGreeting';
import { useChatSession } from './useChatSession';
import { useChatMessages } from './useChatMessages';
import { useChatApi, DEFAULT_SYSTEM_PROMPT } from './useChatApi';
import { useChatStream } from './useChatStream';
import { useAikaStream } from './useAikaStream';
import type { Message, ChatMode, AvailableModule, ApiMessage, ChatEventPayload, ChatRequestPayload, InterventionPlan } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

const UPDATED_AVAILABLE_MODULES: AvailableModule[] = [
  {
    id: 'help_me_start',
    name: 'Mulai dari Mana?',
    description: 'Bantu aku memilih latihan yang cocok untukku saat ini.',
  },
  {
    id: 'cbt_cognitive_restructuring',
    name: 'Menantang Pikiran Negatif',
    description: 'Latihan untuk mengidentifikasi, menantang, dan mengubah pola pikir yang tidak membantu.',
  },
  {
    id: 'cbt_problem_solving',
    name: 'Latihan Memecahkan Masalah',
    description: 'Mengatasi rasa kewalahan dengan memecah masalah menjadi langkah-langkah yang lebih mudah dikelola.',
  },
  {
    id: 'cbt_express_feelings',
    name: 'Belajar Mengekspresikan Perasaan dan Pikiran',
    description: 'Latihan interaktif untuk membantumu mengenali dan mengungkapkan perasaan serta pikiran secara sehat.',
  },
  {
    id: 'cbt_deal_with_guilt',
    name: 'Belajar Mengatasi Rasa Bersalah',
    description: 'Modul untuk membantumu memahami dan mengelola perasaan bersalah secara konstruktif.',
  },
];

export function useChat({ model }: { model: string }) {
  const [inputValue, setInputValue] = useState('');
  const [currentMode, setCurrentMode] = useState<ChatMode>('standard');
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default
  const lastConversationIdRef = useRef<string | null>(null);
  const DRAFT_KEY = 'aika_chat_draft_v1';

  const {
    messages,
    setMessages,
    chatContainerRef,
    addAssistantChunksSequentially,
    startStreamingAssistantMessage,
    appendToStreamingAssistantMessage,
    removeMessageById,
    updateMessageToolIndicator,
  } = useChatMessages();
  const { initialGreeting, isGreetingLoading } = useGreeting(messages);
  const { currentSessionId } = useChatSession();
  const { data: session } = useSession();
  const { isLoading, error, processApiCall, cancelCurrent } = useChatApi(
    currentSessionId,
    currentMode,
    addAssistantChunksSequentially,
    setMessages,
  );
  const { status: streamStatus, isStreaming, startStreaming, cancelStreaming } = useChatStream();
  const {
    isStreaming: isAikaStreaming,
    currentStatus: aikaStatus,
    streamMessage: streamAikaMessage,
    cancelStream: cancelAikaStream,
  } = useAikaStream();
  const isBusy = isLoading || isStreaming || isAikaStreaming;

  useEffect(() => {
    if (messages.length === 0 && !isGreetingLoading && initialGreeting) {
      const newConversationId = uuidv4();
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: initialGreeting,
          timestamp: new Date(),
          session_id: currentSessionId,
          conversation_id: newConversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  }, [isGreetingLoading, initialGreeting, messages.length, currentSessionId, setMessages]);

  const handleSendMessage = useCallback(async (message?: string) => {
    const userMessageContent = (typeof message === 'string' ? message : inputValue).trim();
    if (!userMessageContent) return;
    if (isBusy) return;

    const activeConversationId =
      messages.find((m) => m.conversation_id)?.conversation_id || lastConversationIdRef.current || uuidv4();
    lastConversationIdRef.current = activeConversationId;

    const newUserMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}

    const historyForApi: ApiMessage[] = [...messages, newUserMessage]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const streamingPayload: ChatRequestPayload = {
      message: userMessageContent,
      history: historyForApi,
      google_sub: session?.user?.id ?? '',
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      model,
    };

    const streamMessageId = startStreamingAssistantMessage(currentSessionId, activeConversationId);
    let toolIndicatorDetected = false;
    let accumulatedContent = '';

    const fallbackToRest = async () => {
      removeMessageById(streamMessageId);
      await processApiCall({
        messageContent: userMessageContent,
        history: historyForApi,
        conversation_id: activeConversationId,
        model,
      });
    };

    const streamingStarted = await startStreaming(streamingPayload, {
      onToken: (chunk) => {
        const chunkStr = String(chunk);
        accumulatedContent += chunkStr;
        
        // Check if tool indicator is present (starts with 🔧)
        if (!toolIndicatorDetected && accumulatedContent.includes('🔧')) {
          const toolIndicatorMatch = accumulatedContent.match(/🔧\s*_([^_]+)_/);
          if (toolIndicatorMatch) {
            toolIndicatorDetected = true;
            const toolIndicatorText = toolIndicatorMatch[0];
            updateMessageToolIndicator(streamMessageId, toolIndicatorText);
            
            // Remove tool indicator from content
            accumulatedContent = accumulatedContent.replace(toolIndicatorMatch[0], '').trim();
            
            // Update message content without the indicator
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamMessageId
                  ? {
                      ...msg,
                      content: accumulatedContent,
                      updated_at: new Date().toISOString(),
                    }
                  : msg,
              ),
            );
            return;
          }
        }
        
        appendToStreamingAssistantMessage(streamMessageId, chunkStr);
      },
      onCompleted: (event) => {
        const finalResponse = typeof event.response === 'string' ? event.response : '';
        
        // Remove tool indicator from final response if present
        let cleanedResponse = finalResponse;
        const toolIndicatorMatch = cleanedResponse.match(/🔧\s*_([^_]+)_\n*/);
        if (toolIndicatorMatch) {
          cleanedResponse = cleanedResponse.replace(toolIndicatorMatch[0], '').trim();
        }
        
        // DEBUG: Log the entire event to see what's being received
        console.log('🔍 [DEBUG] WebSocket completed event:', event);
        console.log('🔍 [DEBUG] interventionPlan in event:', event.interventionPlan);
        
        // Handle intervention plan if present
        const interventionPlan = event.interventionPlan as InterventionPlan | undefined;
        
        // Instead of finalizing the streaming message as-is,
        // split it into multiple bubbles for better readability
        removeMessageById(streamMessageId);
        
        // Use addAssistantChunksSequentially to split the message
        void addAssistantChunksSequentially(
          cleanedResponse,
          streamMessageId, // Use streamMessageId as loader (already removed above)
          currentSessionId,
          activeConversationId
        ).then(() => {
          // After chunks are added, update the last chunk with intervention plan if present
          if (interventionPlan) {
            setMessages((prev) => {
              const lastAssistantIndex = prev.length - 1;
              if (lastAssistantIndex >= 0 && prev[lastAssistantIndex].role === 'assistant') {
                return prev.map((msg, idx) =>
                  idx === lastAssistantIndex
                    ? { ...msg, interventionPlan }
                    : msg
                );
              }
              return prev;
            });
          }
        });
      },
      onError: (messageText) => {
        // Log the streaming error for diagnostics (do not expose stack traces or sensitive details to users)
        // This uses the parameter so the linter won't report it as unused.
        console.error('Chat streaming error:', messageText);
        void fallbackToRest();
      },
    });

    if (!streamingStarted) {
      await fallbackToRest();
    }
  }, [
    inputValue,
    isBusy,
    messages,
    currentSessionId,
    processApiCall,
    model,
    setMessages,
    session?.user?.id,
    startStreamingAssistantMessage,
    appendToStreamingAssistantMessage,
    removeMessageById,
    startStreaming,
    updateMessageToolIndicator,
    addAssistantChunksSequentially,
  ]);

  const handleStartModule = useCallback(
    async (moduleId: string) => {
      if (isBusy) return;

      const activeConversationId = messages.find((m) => m.conversation_id)?.conversation_id || uuidv4();

      const systemMessageContent = `Memulai modul: ${
        UPDATED_AVAILABLE_MODULES.find((m) => m.id === moduleId)?.name || moduleId
      }...`;
      const systemMessage: Message = {
        id: uuidv4(),
        role: 'system' as const,
        content: systemMessageContent,
        timestamp: new Date(),
        session_id: currentSessionId,
        conversation_id: activeConversationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const messagesWithSystem = [...messages, systemMessage];
      setMessages(messagesWithSystem);
      setCurrentMode(`module:${moduleId}`);

      const historyForApi: ApiMessage[] = messagesWithSystem
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .slice(-10)
        .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      const eventPayload: ChatEventPayload = { type: 'start_module', module_id: moduleId };

      await processApiCall({
        event: eventPayload,
        history: historyForApi.length > 0 ? historyForApi : undefined,
        conversation_id: activeConversationId,
        model,
      });
    },
    [isBusy, messages, currentSessionId, processApiCall, setMessages, model],
  );

  // Streaming handler for progressive Aika responses
  const handleSendMessageStreaming = useCallback(async (message?: string) => {
    const messageText = (message ?? inputValue).trim();
    if (!messageText || isAikaStreaming) return;

    // Calculate active conversation ID
    const activeConversationId =
      messages.find((m) => m.conversation_id)?.conversation_id || lastConversationIdRef.current || uuidv4();
    lastConversationIdRef.current = activeConversationId;

    const newInputValue = message === undefined ? '' : inputValue;
    setInputValue(newInputValue);
    try {
      if (newInputValue === '') {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {}

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Create assistant placeholder with loading state
    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      isLoading: true,
      toolIndicator: 'Memproses permintaan...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Prepare conversation history
    const updatedMessages = [...messages, userMessage];
    const conversationHistory = updatedMessages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10)
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    try {
      // Stream the message with progressive updates
      await streamAikaMessage(
        messageText,
        conversationHistory,
        currentSessionId,
        'user',
        {
          // Thinking indicator
          onThinking: (message: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, toolIndicator: message }
                  : msg
              )
            );
          },

          // Node status updates
          onStatus: (node: string, message: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, toolIndicator: message }
                  : msg
              )
            );
          },

          // Agent invocation notifications
          onAgentInvoked: (agent: string, name: string, description?: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, toolIndicator: `${name} sedang bekerja...` }
                  : msg
              )
            );
          },

          // Intervention plan received
          onInterventionPlan: (plan: any) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, interventionPlan: plan }
                  : msg
              )
            );
          },

          // Appointment received
          onAppointment: (appointment: any) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, appointment }
                  : msg
              )
            );
          },

          // Agent activity metadata
          onAgentActivity: (activity: any) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, agentActivity: activity }
                  : msg
              )
            );
          },

          // Final complete response
          onComplete: (response: string, metadata: any) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: response,
                      isLoading: false,
                      toolIndicator: undefined,
                      agentActivity: metadata.agent_activity || msg.agentActivity,
                    }
                  : msg
              )
            );
          },

          // Error handling
          onError: (error: string) => {
            console.error('Streaming error:', error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
                      isLoading: false,
                      isError: true,
                      toolIndicator: undefined,
                    }
                  : msg
              )
            );
          },
        }
      );
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
                isLoading: false,
                isError: true,
                toolIndicator: undefined,
              }
            : msg
        )
      );
    }
  }, [
    inputValue,
    isAikaStreaming,
    messages,
    lastConversationIdRef,
    currentSessionId,
    streamAikaMessage,
    setMessages,
  ]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    try {
      localStorage.setItem(DRAFT_KEY, value);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) setInputValue(stored);
    } catch {}
  }, []);

  const setLiveTranscript = useCallback((transcript: string) => {
    setInputValue(transcript);
  }, []);

  const handleCancel = useCallback(() => {
    if (isStreaming) {
      cancelStreaming();
    } else {
      cancelCurrent();
    }
  }, [isStreaming, cancelStreaming, cancelCurrent]);

  return {
    messages,
    inputValue,
    isLoading: isBusy,
    error,
    currentMode,
    availableModules: UPDATED_AVAILABLE_MODULES,
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleSendMessageStreaming,
    handleStartModule,
    setLiveTranscript,
    cancelCurrent: handleCancel,
    streamStatus,
    isAikaStreaming,
    aikaStatus,
    cancelAikaStream,
  };
}
