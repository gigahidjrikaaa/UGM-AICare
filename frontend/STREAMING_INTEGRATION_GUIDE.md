// Streaming message handler for Aika - add this to useChat.tsx

// Add near the top with other hooks:
import { useAikaStream } from './useAikaStream';

// Add with other hook calls:
const {
  isStreaming: isAikaStreaming,
  currentStatus: aikaStatus,
  streamMessage: streamAikaMessage,
  cancelStream: cancelAikaStream,
} = useAikaStream();

// Update isBusy:
const isBusy = isLoading || isStreaming || isAikaStreaming;

// Add this function before the return statement:
const handleSendMessageStreaming = useCallback(async (message?: string) => {
  const messageText = (message ?? inputValue).trim();
  if (!messageText || isAikaStreaming) return;

  const userMessage: Message = {
    id: uuidv4(),
    conversation_id: lastConversationIdRef.current || uuidv4(),
    session_id: currentSessionId,
    content: messageText,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInputValue('');
  localStorage.removeItem(DRAFT_KEY);

  // Create assistant message placeholder
  const assistantMessageId = uuidv4();
  const assistantMessage: Message = {
    id: assistantMessageId,
    conversation_id: userMessage.conversation_id,
    session_id: currentSessionId,
    content: '',
    role: 'assistant',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    timestamp: new Date(),
    isLoading: true,
    toolIndicator: 'Memproses...',
  };

  setMessages((prev) => [...prev, assistantMessage]);

  // Stream with callbacks
  await streamAikaMessage(
    messageText,
    messages.map((m) => ({ role: m.role, content: m.content })),
    currentSessionId,
    'user',
    {
      onThinking: (msg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, toolIndicator: msg } : m
          )
        );
      },
      onStatus: (node, msg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, toolIndicator: msg } : m
          )
        );
      },
      onAgentInvoked: (agent, name) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, toolIndicator: name } : m
          )
        );
      },
      onInterventionPlan: (plan) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, interventionPlan: plan } : m
          )
        );
      },
      onAppointment: (appointment) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, appointment } : m
          )
        );
      },
      onAgentActivity: (activity) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, agentActivity: activity } : m
          )
        );
      },
      onComplete: (response, metadata) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: response,
                  isLoading: false,
                  toolIndicator: undefined,
                  metadata,
                }
              : m
          )
        );
      },
      onError: (errorMessage) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: `Error: ${errorMessage}`,
                  isLoading: false,
                  isError: true,
                  toolIndicator: undefined,
                }
              : m
          )
        );
      },
    }
  );
}, [inputValue, isAikaStreaming, currentSessionId, messages, streamAikaMessage, setMessages]);

// Add to return object:
return {
  // ... existing returns ...
  handleSendMessageStreaming,
  isAikaStreaming,
  aikaStatus,
  cancelAikaStream,
};
