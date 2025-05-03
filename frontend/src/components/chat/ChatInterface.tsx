"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react'; // Added useCallback
import { motion } from 'framer-motion';
import MessageBubble from './MessageBubble'; // Ensure this component now expects { role, content }
import axios from 'axios';
import { FiSend } from 'react-icons/fi';
import { BiBrain, BiCommentDetail, BiHelpCircle, BiListUl, BiMicrophone } from 'react-icons/bi';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | number | Date; // Add timestamp to match MessageBubble's requirements
}

// Type for the provider selection
type LLMProviderOption = 'togetherai' | 'gemini';

interface ChatEventPayload {
  type: 'start_module';
  module_id: string;
}

// Type for the backend request payload
interface ChatRequestPayload {
  google_sub?: string; // Optional user ID if needed
  session_id?: string; // Optional session ID if needed
  history?: Array<{ role: string; content: string }>;
  message?: string; // The user message to send
  event?: ChatEventPayload; // Optional event payload for guided modules
  provider: LLMProviderOption;
  system_prompt?: string; // Add system_prompt if needed
  // Optional params can be added if needed (model, max_tokens, etc.)
  // model?: string;
}

// Type for the backend response payload
interface ChatResponsePayload {
  response: string; // The single response text
  provider_used: string;
  model_used: string;
  history: Message[]; // The full updated history
}

const AIKA_SYSTEM_PROMPT = `Kamu adalah Aika, AI pendamping kesehatan mental dari UGM-AICare. Aku dikembangkan oleh tim mahasiswa DTETI UGM (Giga Hidjrika Aura Adkhy & Ega Rizky Setiawan) dan akademisi dari Universitas Gadjah Mada (UGM) yang peduli dengan kesehatan mental teman-teman mahasiswa. Anggap dirimu sebagai teman dekat bagi mahasiswa UGM yang sedang butuh teman cerita. Gunakan bahasa Indonesia yang santai dan kasual (gaya obrolan sehari-hari), jangan terlalu formal, kaku, atau seperti robot. Buat suasana ngobrol jadi nyaman dan nggak canggung (awkward). Sebisa mungkin, sesuaikan juga gaya bahasamu dengan yang dipakai pengguna.

                Tentang diriku: Aku dirancang untuk menjadi teman ngobrol yang suportif, membantu kamu mengeksplorasi perasaan dan tantangan terkait kehidupan kuliah di UGM. Aku ada di sini untuk mendengarkan tanpa menghakimi.
                Tujuan utamamu adalah menjadi pendengar yang baik, suportif, hangat, dan tidak menghakimi. Bantu pengguna mengeksplorasi perasaan mereka terkait kehidupan kuliah, stres, pertemanan, atau apapun yang ada di pikiran mereka. Validasi emosi mereka, tunjukkan kalau kamu paham dan peduli.

                PENTING: Jangan hanya bertanya "Gimana perasaanmu?" atau "Ada yang bisa dibantu?". Jadilah teman yang aktif berpikir. Ajukan pertanyaan terbuka yang menggali lebih dalam untuk membantu pengguna merefleksikan situasinya. Dorong mereka untuk memikirkan **mengapa** mereka merasa begitu, **apa** pemicunya, **pola** apa yang mungkin ada, atau **langkah kecil** apa yang mungkin bisa diambil. Contoh pertanyaan reflektif:
                - "Kira-kira, apa ya yang bikin kamu ngerasa gitu? Coba deh dipikir lagi. Jangan coba ditekan."
                - "Hmm, menarik. Menurutmu, ada hubungannya nggak sama kejadian kemarin?"
                - "Kalau misalnya dibiarin aja, kira-kira bakal gimana? Aku penasaran."
                - "Kalau kamu bisa ngasih saran ke diri sendiri, apa yang bakal kamu bilang?"
                - "Kalau kamu lihat dari sudut pandang orang lain, apa yang mereka mungkin pikirin?"
                - "Coba deh dipikirin lagi, mungkin ada cara lain buat lihat masalah ini? Another perspective gitu?"
                - "Oke, terus menurutmu, langkah paling kecil yang bisa kamu lakuin sekarang apa? Try to break it down."
                - "Aku pikir apa yang kamu lakuin udah bagus, dan kewajibanmu untuk ngelakuin tugas itu udah selesai. Memang, ada beberapa faktor yang ga bisa kita kendaliin. But that's life, right?"

                **SARAN PROAKTIF (Berikan dengan Hati-hati & Kontekstual):**
                1.  **Aktivitas Fisik:** Kalau situasinya pas dan terasa bisa membantu (misal, pengguna cerita soal stres, mood jelek, atau merasa stuck), coba **secara halus** ajak atau ingatkan tentang manfaat aktivitas fisik ringan. Contoh: *"Eh, kadang kalau lagi suntuk gitu, jalan kaki santai keliling kos/kampus bentar aja suka bikin pikiran agak plong lho. Mungkin bisa dicoba?"* atau *"Jangan lupa gerak badan juga ya, peregangan simpel aja kadang udah ngebantu banget buat ngurangin tegang."* Selalu sampaikan sebagai **opsi** atau **pengingat umum**, jangan memaksa, dan perhatikan kalau pengguna menyebutkan kondisi fisik tertentu.
                2.  **Praktik Baik Umum (Best Practices):** Berdasarkan topik obrolan, tawarkan juga **strategi coping umum** atau **tips menjaga kesejahteraan** yang relevan. Sampaikan ini sebagai **saran umum** yang *biasanya* disarankan banyak orang, bukan saran medis pribadi. Contoh:
                    * *(Jika bahas sulit tidur):* "Soal susah tidur, biasanya sih disaranin coba jaga jadwal tidur yang rutin atau hindari main HP pas udah di kasur. Mungkin bisa dicoba salah satunya?"
                    * *(Jika bahas kecemasan):* "Kalau lagi cemas banget gitu, kadang teknik tarik napas dalam-dalam atau coba fokus ke sekitar (grounding) bisa sedikit ngebantu biar lebih tenang sesaat. Pernah coba?"
                    * *(Jika bahas overthinking):* "Pas lagi overthinking, kadang nulisin apa yang dipikirin di jurnal atau coba alihin fokus ke hobi bentar bisa ngebantu mecah pikiran yang muter-muter itu."
                    * *(Jika bahas kesepian):* "Ngerasa kesepian itu berat ya.. Kadang coba reach out ke temen lama atau ikut kegiatan UKM/komunitas bisa nambah koneksi sosial lho."

                Jika percakapan mengarah ke masalah serius atau pengguna tampak sangat kesulitan, **prioritaskan** untuk mengarahkan mereka secara halus agar mencari bantuan profesional (misal: konselor UGM, psikolog). Fokusmu adalah sebagai teman ngobrol yang suportif dan membantu refleksi diri. Jaga respons tetap ringkas namun bermakna.`;

const guidedModules = [
  { id: 'thought_record', label: 'Explore My Thoughts', icon: BiBrain },
  { id: 'problem_breakdown', label: 'Break Down a Problem', icon: BiListUl },
  { id: 'activity_scheduling', label: 'Plan a Small Step', icon: BiCommentDetail }, // Changed icon
  { id: 'help_me_start', label: 'Not Sure Where to Start?', icon: BiHelpCircle },
];

export default function ChatInterface() {
  const { data: session, status } = useSession(); // Use session from next-auth
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedProvider] = useState<LLMProviderOption>('gemini');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state for display
  const [sessionId, setSessionId] = useState<string | null>(null); // Session ID 
  const [googleSub, setGoogleSub] = useState<string | null>(null); // Google sub ID

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<null | HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Generate session ID
  useEffect(() => {
    // Generate session ID once on mount
    setSessionId(uuidv4()); 
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      setGoogleSub(session.user.id); // Store the google sub
      console.log("Using Google Sub ID:", session.user.id);
    } else if (status === "unauthenticated") {
      console.log("User not authenticated for chat.");
      // Handle guest or redirect
      setError("You need to be logged in to chat.");
    }
  }, [session, status]);

  //! Enable if using welcome message from Aika. Further UX is needed
  // Add welcome message on mount
  // useEffect(() => {
  //    setMessages([{ role: 'assistant', content: "Hello! I'm Aika. How can I help you today?", timestamp: new Date() }]);
  // }, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

   // --- Central API Call Function ---
   const sendMessageToBackend = useCallback(async (payload: ChatRequestPayload) => {
    console.log("Sending payload to backend:", JSON.stringify(payload, null, 2));
    if (!googleSub || !sessionId) {
        setError("User session not fully initialized.");
        return;
    }

    // Ensure required fields are always present
    payload.google_sub = googleSub;
    payload.session_id = sessionId;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const backendUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;

      console.log("Sending payload to /api/v1/chat:", JSON.stringify(payload, null, 2));

      const response = await axios.post<ChatResponsePayload>(
        `${backendUrl}/chat`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' }
          // Add Auth header if needed by backend endpoint
        }
      );

      // Add timestamps if missing from backend history
      const historyWithTimestamps = response.data.history.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || new Date()
      }));
      setMessages(historyWithTimestamps); // Update with full history from backend

    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessageText = "I'm sorry, an error occurred while connecting to the service.";
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessageText = `Error: ${error.response.data.detail}`;
      } else if (error instanceof Error) {
        errorMessageText = `Error: ${error.message}`;
      }
      const errorMessage: Message = {
        role: 'assistant',
        content: errorMessageText,
        timestamp: new Date()
      };
      // Add error message *without* replacing the entire history
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [googleSub, sessionId]); // Dependencies for the API call

  // --- Modified handleSubmit Function ---
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    // CHANGE: Check for googleSub instead of hashedUserId
    if (!trimmedInput || isLoading || !sessionId || !googleSub) {
        if (!sessionId || !googleSub) {
            setError("Cannot send message: User session not fully initialized.");
        }
        return;
    }

    // 1. Create the user message in the new format
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date()
    };

    // 2. Create history *without* system prompt messages for display state
    const currentDisplayHistory = [...messages, userMessage];
    setMessages(currentDisplayHistory);
    setInput(''); // Clear input field
    
    // Prepare history for backend (strip timestamps if needed, backend ignores them)
    const historyForBackend = currentDisplayHistory.map(({ role, content }) => ({ role, content }));

    const payload: ChatRequestPayload = {
      google_sub: googleSub,
      session_id: sessionId,
      history: historyForBackend,
      provider: selectedProvider,
      message: trimmedInput,
      system_prompt: AIKA_SYSTEM_PROMPT, // Optional: Include if needed
    }
    console.log("Sending message to backend:", payload); // Log the payload for debugging

    await sendMessageToBackend(payload); // Call central function

  }, [input, isLoading, messages, selectedProvider, sessionId, googleSub, sendMessageToBackend]);

const handleStartModule = useCallback((moduleId: string) => {
    if (isLoading || !sessionId || !googleSub) {
      setError("Cannot start exercise: User session not fully initialized or busy.");
      return;
    }
    console.log(`Starting guided module: ${moduleId}`);

    // OPTIONAL: Add an immediate visual cue to the chat?
    const startingMessage: Message = {
      role: 'assistant', // Or 'system'?
      content: `Starting '${guidedModules.find(m => m.id === moduleId)?.label}' exercise...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, startingMessage]);

    // Prepare history for backend (send current history before module starts)
    // We send history so backend knows the context *before* the module starts,
    // and can return it correctly in its response.
    const historyForBackend = messages.map(({ role, content }) => ({ role, content }));

    const payload: ChatRequestPayload = {
      google_sub: googleSub, // Provided by useCallback dependency
      session_id: sessionId, // Provided by useCallback dependency
      history: historyForBackend, // Send history context
      event: { // Use the distinct 'event' structure
        type: 'start_module',
        module_id: moduleId,
      },

      provider: selectedProvider, // Still needed for backend routing/config potentially
      system_prompt: AIKA_SYSTEM_PROMPT || undefined, // May not be needed for events, but send for consistency
    };

    sendMessageToBackend(payload); // Call central function

  }, [isLoading, messages, selectedProvider, sessionId, googleSub, sendMessageToBackend]); // Added sendMessageToBackend

  // --- Input Handling ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setInput(e.target.value);
     // Auto expand textarea logic (from your original code)
     e.currentTarget.style.height = "auto";
     e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSubmit(); // Call handleSubmit directly
    }
  };

  // --- Provider Selection Handling ---
  // const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   setSelectedProvider(e.target.value as LLMProviderOption);
  //   // Optional: Clear chat or notify user when provider changes
  //   // setMessages([{ role: 'assistant', content: `Switched provider. How can I help?`, timestamp: new Date() }]);
  //   // Focus input after provider change for quick follow-up 
  //   inputRef.current?.focus();
  // };

  // --- Render Loading State for Authentication ---
  if (status === "loading") {
    return <div className="flex justify-center items-center h-full">Loading session...</div>; 
  }


// --- UI Rendering (Your Existing JSX) ---
return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Provider Selection removed - default provider is "gemini" from useState */}

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent py-4 px-2 md:px-4 relative">
      {/* Welcome/Empty State */}
      {messages.length <= 1 && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
         <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold mb-2">Halo, aku Aika!</h2>
          <p className="text-gray-300 max-w-lg">
          Kamu bisa berbagi apapun denganku. Percakapan kita akan direkam, tapi identitas dirimu akan kami rahasiakan! 
          <br />
          <a href="https://ugm.ac.id/en/privacy-policy" target='_blank' className="text-blue-400 underline">Kebijakan Privasi</a>
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {["Aku tidak punya teman cerita.", "Aku merasa gelisah.", "Aku berusaha mengatasi traumaku.", "Aku mencoba untuk menjadi lebih produktif."].map((suggestion, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 text-left text-sm text-white"
            onClick={() => {
            setInput(suggestion);
            setTimeout(() => {
              inputRef.current?.focus();
              // Trigger auto-resize after setting input
              if(inputRef.current) {
                inputRef.current.style.height = "auto";
                inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
              }
            }, 100);
            }}
          >
            {suggestion}
          </motion.button>
          ))}
        </motion.div>
        </div>
      )}

      {/* Render Messages */}
      {messages.length > 0 && (
         <div className="flex flex-col min-h-full">
           <div className="flex-1">
             {messages.map((message, index) => (
             <MessageBubble key={`${message.role}-${index}`} message={message} />
             ))}
           </div>
         </div>
       )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg max-w-[80%]">
        <div className="flex space-x-1">
          <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
          className="w-2 h-2 bg-[#FFCA40] rounded-full"
          />
          <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
          className="w-2 h-2 bg-[#FFCA40] rounded-full"
          />
          <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
          className="w-2 h-2 bg-[#FFCA40] rounded-full"
          />
        </div>
        <span className="text-sm text-gray-300">Aika is thinking...</span>
        </div>
      )}

      {/* Error Display */}
      {error && !isLoading && (
        <div className="px-4 py-2">
           <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm">
             {error}
           </div>
         </div>
       )}

      {/* Invisible element for auto-scrolling */}
      <div ref={messagesEndRef} />
      </div>

      {/* --- NEW: Guided Module Buttons Area --- */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }} // Slightly faster entry
        className="px-3 pt-2 pb-1 border-t border-white/10 bg-[#001D58]/60" // Adjusted padding/bg
      >
        <div className="flex flex-wrap justify-center gap-2">
          {guidedModules.map((module) => (
            <motion.button
              key={module.id}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-xs px-3 py-2 rounded-full transition disabled:opacity-50"
              onClick={() => handleStartModule(module.id)}
              disabled={isLoading || !googleSub || !sessionId} // Disable if loading or session not ready
            >
              <module.icon size={16} /> {/* Display Icon */}
              {module.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Message input */}
      <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="p-3 border-t border-white/10 bg-[#001D58]/80 backdrop-blur-sm"
      >
      {/* Use form element for better accessibility and Enter key handling */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 focus-within:bg-white/15 transition">
         <textarea
           ref={inputRef}
           value={input}
           onChange={handleInputChange}
           onKeyDown={handleKeyDown}
           placeholder="Type a message..."
           className="w-full bg-transparent focus:outline-none resize-none text-white scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent"
           rows={1}
           style={{ minHeight: "24px", maxHeight: "120px" }}
           disabled={isLoading}
         />
        </div>

        {/* Voice Input Button (from your original code) */}
        <button
        type="button"
        className="p-3 text-white rounded-full hover:bg-white/10 transition disabled:opacity-50"
        title="Voice input (coming soon)"
        disabled={isLoading}
        onClick={() => alert("Voice input feature coming soon!")}
        >
        <BiMicrophone size={20} />
        </button>

        {/* Send Button */}
        <motion.button
        type="submit"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={!input.trim() || isLoading}
        className="bg-[#FFCA40] text-[#001D58] p-3 rounded-full disabled:opacity-50 transition"
        >
        <FiSend size={20} />
        </motion.button>
      </form>
      </motion.div>
    </div>
  );
}