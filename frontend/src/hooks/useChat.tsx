// src/hooks/useChat.ts
import { useState, useCallback, useEffect } from 'react';
import { useGreeting } from './useGreeting';
import { useChatSession } from './useChatSession';
import { useChatMessages } from './useChatMessages';
import { useChatApi } from './useChatApi';
import type { Message, ChatMode, AvailableModule, ApiMessage, ChatEventPayload } from '@/types/chat';
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

  const { messages, setMessages, chatContainerRef, addAssistantChunksSequentially } = useChatMessages();
  const { initialGreeting, isGreetingLoading } = useGreeting(messages);
  const { currentSessionId } = useChatSession();
  const { isLoading, error, processApiCall } = useChatApi(currentSessionId, currentMode, addAssistantChunksSequentially, setMessages);

  // useEffect that sets the initial message for Aika
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

  const handleSendMessage = useCallback(async () => {
    const userMessageContent = inputValue.trim();
    if (!userMessageContent || isLoading) return;

    const activeConversationId = messages.find(m => m.conversation_id)?.conversation_id || uuidv4();

    const newUserMessage: Message = {
      id: uuidv4(),
      role: 'user' as const,
      content: userMessageContent,
      timestamp: new Date(),
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const messagesWithUser = [...messages, newUserMessage];
    setMessages(messagesWithUser);
    setInputValue('');

    const historyForApi: ApiMessage[] = messagesWithUser
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10)
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

    await processApiCall({
      messageContent: userMessageContent,
      history: historyForApi,
      conversation_id: activeConversationId,
      model: model,
    });
  }, [inputValue, isLoading, messages, currentSessionId, processApiCall, model, setMessages]);

  const handleStartModule = useCallback(async (moduleId: string) => {
    if (isLoading) return;

    const activeConversationId = messages.find(m => m.conversation_id)?.conversation_id || uuidv4();

    const systemMessageContent = `Memulai modul: ${UPDATED_AVAILABLE_MODULES.find(m => m.id === moduleId)?.name || moduleId}...`;
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
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10)
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

    const eventPayload: ChatEventPayload = { type: 'start_module', module_id: moduleId };

    await processApiCall({
      event: eventPayload,
      history: historyForApi.length > 0 ? historyForApi : undefined,
      conversation_id: activeConversationId,
      model: model,
    });
  }, [isLoading, messages, currentSessionId, processApiCall, model, setMessages]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  return {
    messages,
    inputValue,
    isLoading,
    error,
    currentMode,
    availableModules: UPDATED_AVAILABLE_MODULES,
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleStartModule,
  };
}
