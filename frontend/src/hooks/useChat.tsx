// src/hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react'; // Use client-side session hook

import type { Message, ChatMode } from '@/types/chat';
import type { ApiMessage, ChatRequestPayload, ChatResponsePayload } from '@/types/api';
import { sendMessage as sendApiMessage } from '@/services/api'; // Assuming api.ts exports this

// Define default system prompt (can be overridden)
const DEFAULT_SYSTEM_PROMPT = `Kamu adalah Aika, AI pendamping kesehatan mental dari UGM-AICare... (rest of your detailed prompt)`; // Shortened for brevity

// Define available modules (could be fetched from backend later)
const AVAILABLE_MODULES = [
    { id: 'help_me_start', name: 'Mulai dari Mana?', description: 'Bantu aku memilih latihan yang cocok.' },
    { id: 'thought_record', name: 'Latihan Catatan Pikiran', description: 'Mengidentifikasi dan mengevaluasi pikiran negatif.' },
    { id: 'problem_breakdown', name: 'Latihan Memecah Masalah', description: 'Mengatasi rasa kewalahan dengan memecah masalah.' },
    { id: 'activity_scheduling', name: 'Latihan Penjadwalan Aktivitas', description: 'Merencanakan kegiatan positif kecil.' },
];


export function useChat() {
  const { data: session } = useSession(); // Get user session
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ChatMode>('standard');
  const [sessionId] = useState<string>(() => uuidv4()); // Generate unique session ID on hook init
  const chatContainerRef = useRef<HTMLDivElement | null>(null); // For scrolling

  // --- Initial Greeting ---
  useEffect(() => {
    // Display initial greeting only once when component mounts and messages are empty
    if (messages.length === 0) {
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: "Halo! Aku Aika, teman AI-mu dari UGM-AICare. Ada yang ingin kamu ceritakan hari ini? 😊",
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]); // Only run on first render

  // --- Scroll to Bottom ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // Scroll whenever messages change

  // --- API Call Logic ---
  const processMessage = useCallback(async (
    payload: Omit<ChatRequestPayload, 'google_sub' | 'session_id'> // Omit fields we'll add
  ) => {
    if (!session?.user?.id) {
        toast.error("Autentikasi gagal. Silakan login kembali.");
        setError("User not authenticated");
        return;
    }

    setIsLoading(true);
    setError(null);

    // Add a temporary loading message for the assistant
    const assistantLoadingId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: assistantLoadingId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
    ]);

    const fullPayload: ChatRequestPayload = {
        ...payload,
        google_sub: session.user.id, // Get sub from session
        session_id: sessionId,
        system_prompt: DEFAULT_SYSTEM_PROMPT, // Include default system prompt
    };

    try {
      console.log("Sending payload to backend:", JSON.stringify(fullPayload, null, 2)); // Log payload
      const data: ChatResponsePayload = await sendApiMessage(fullPayload);
      console.log("Received response from backend:", JSON.stringify(data, null, 2)); // Log response

      // Update the loading message with the actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantLoadingId
            ? { ...msg, content: data.response, isLoading: false }
            : msg
        )
      );

      // Potentially handle mode changes or suggestions based on response
      if (data.suggestions) {
        // Example: if backend suggests modules, switch mode
        // setCurrentMode('module_selection');
      }
      if (data.module_state) {
        // Example: if backend updates module state
        // setCurrentMode(`module:${data.module_state.module}`);
        // setModuleStep(data.module_state.step); // Need state for this
      }


    } catch (err: unknown) {
      console.error("API Error:", err);
      let errorMessage = "Gagal menghubungi Aika. Coba lagi nanti.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      toast.error(errorMessage);
      setError(errorMessage);
       // Remove the loading message on error
       setMessages((prev) => prev.filter((msg) => msg.id !== assistantLoadingId));
    } finally {
      setIsLoading(false);
    }
  }, [session, sessionId]); // Add sessionId dependency

  // --- Send User Message ---
  const handleSendMessage = useCallback(async () => {
    const userMessageContent = inputValue.trim();
    if (!userMessageContent || isLoading) return;

    const newUserMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue(''); // Clear input

    // Prepare history for API (convert to backend format if needed)
    const historyForApi: ApiMessage[] = [...messages, newUserMessage] // Include the new user message
      .filter(msg => msg.role !== 'system') // Exclude system messages from history sent
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
        // timestamp: msg.timestamp.toISOString(), // Backend might expect ISO string
      }));

    // Send payload for standard message
    await processMessage({
        message: userMessageContent,
        history: historyForApi,
        // Add other defaults if needed: provider, model etc.
    });

  }, [inputValue, isLoading, messages, processMessage]);

  // --- Start a Module ---
  const handleStartModule = useCallback(async (moduleId: string) => {
    if (isLoading) return;

    // You might want an introductory message before the module starts
    const systemMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: `Memulai modul: ${AVAILABLE_MODULES.find(m => m.id === moduleId)?.name || moduleId}...`,
        timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
    setCurrentMode(`module:${moduleId}`); // Set mode immediately

    // Prepare history (can be empty or based on current messages before the system one)
     const historyForApi: ApiMessage[] = messages
      .filter(msg => msg.role !== 'system') // Exclude system messages
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Send payload with event
    await processMessage({
        event: { type: 'start_module', module_id: moduleId },
        history: historyForApi.length > 0 ? historyForApi : undefined, // Send history if available
    });
  }, [isLoading, messages, processMessage]);


  // --- Input Change Handler ---
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);


  return {
    messages,
    inputValue,
    isLoading,
    error,
    currentMode,
    availableModules: AVAILABLE_MODULES, // Expose modules
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleStartModule,
  };
}