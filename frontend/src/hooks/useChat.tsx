// src/hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react'; // Use client-side session hook
import apiClient from '@/services/api';

import type { Message, ChatMode } from '@/types/chat';
import type { ApiMessage, ChatRequestPayload, ChatResponsePayload } from '@/types/api';
import { sendMessage as sendApiMessage } from '@/services/api'; 
import { splitLongMessage, countWords, calculateReadTimeMs } from '@/lib/textUtils';

// Define default system prompt (can be overridden)
const DEFAULT_SYSTEM_PROMPT = `Kamu adalah Aika, AI pendamping kesehatan mental dari UGM-AICare. Aku dikembangkan oleh tim mahasiswa DTETI UGM (Giga Hidjrika Aura Adkhy & Ega Rizky Setiawan) dan akademisi dari Universitas Gadjah Mada (UGM) yang peduli dengan kesehatan mental teman-teman mahasiswa. Anggap dirimu sebagai teman dekat bagi mahasiswa UGM yang sedang butuh teman cerita. Gunakan bahasa Indonesia yang santai dan kasual (gaya obrolan sehari-hari), jangan terlalu formal, kaku, atau seperti robot. Buat suasana ngobrol jadi nyaman dan nggak canggung (awkward). Sebisa mungkin, sesuaikan juga gaya bahasamu dengan yang dipakai pengguna.

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

                Jika percakapan mengarah ke masalah serius atau pengguna tampak sangat kesulitan, **prioritaskan** untuk mengarahkan mereka secara halus agar mencari bantuan profesional (misal: konselor UGM, psikolog). Fokusmu adalah sebagai teman ngobrol yang suportif dan membantu refleksi diri. Jaga respons tetap ringkas namun bermakna.`

// Define available modules (could be fetched from backend later)
const AVAILABLE_MODULES = [
    { id: 'help_me_start', name: 'Mulai dari Mana?', description: 'Bantu aku memilih latihan yang cocok.' },
    { id: 'thought_record', name: 'Latihan Catatan Pikiran', description: 'Mengidentifikasi dan mengevaluasi pikiran negatif.' },
    { id: 'problem_breakdown', name: 'Latihan Memecah Masalah', description: 'Mengatasi rasa kewalahan dengan memecah masalah.' },
    { id: 'activity_scheduling', name: 'Latihan Penjadwalan Aktivitas', description: 'Merencanakan kegiatan positif kecil.' },
];

const MAX_CHUNK_LENGTH = 350; // Adjust character limit per bubble as needed
const MESSAGE_DELAY_MS = 300; // Base delay between chunks (can adjust)


export function useChat() {
  const { data: session, status } = useSession(); // Get user session and status
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ChatMode>('standard');
  const [sessionId] = useState<string>(() => uuidv4()); // Generate unique session ID on hook init
  const chatContainerRef = useRef<HTMLDivElement | null>(null); // For scrolling

  const [initialGreeting, setInitialGreeting] = useState<string>(
    "Halo! Aku Aika, teman AI-mu dari UGM-AICare. Ada yang ingin kamu ceritakan hari ini? 😊"
  );
  const [isGreetingLoading, setIsGreetingLoading] = useState<boolean>(true);

  // --- Initial Greeting ---
  useEffect(() => {
  // Display initial greeting only once when component mounts,
  // messages are empty, and greeting is no longer loading.
  if (messages.length === 0 && !isGreetingLoading) {
    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: initialGreeting, // Use the dynamic initialGreeting
        timestamp: new Date(),
      },
    ]);
  }
}, [messages.length, initialGreeting, isGreetingLoading]); // Dependencies updated

  // --- Fetch Last Session Summary ---
  // This effect fetches the last session summary when the user is authenticated
  useEffect(() => {
  const fetchInitialGreeting = async () => {
      if (session?.user?.id && messages.length === 0) { // Only fetch if user is present and no messages yet
        setIsGreetingLoading(true);
        try {
          // Use your apiClient to call the new backend endpoint
          const response = await apiClient.get<{ summary_text: string | null; timestamp: string | null }>('/user/latest-summary');
          const data = response.data;

          if (data && data.summary_text) {
            // Construct a personalized greeting
            // Example: "Welcome back! Last time we talked about [summary]. How are you today?"
            // Be mindful of the summary length and presentation.
            const personalizedGreeting = `Halo! Senang bertemu denganmu lagi. Di sesi terakhir kita, kita sempat membahas tentang ${data.summary_text}. Ada yang ingin kamu ceritakan atau lanjutkan hari ini?`;
            setInitialGreeting(personalizedGreeting);
          }
          // If no summary, the default greeting remains.
        } catch (error) {
          console.error("Failed to fetch last session summary:", error);
          // Keep default greeting on error
        } finally {
          setIsGreetingLoading(false);
        }
      } else if (messages.length > 0) {
          setIsGreetingLoading(false); // If messages already exist, no need to fetch greeting
      }
    };

    if (status === 'authenticated') {
      fetchInitialGreeting();
    } else if (status === 'unauthenticated') {
      setIsGreetingLoading(false); // Not logged in, no summary to fetch
    }
  }, [session, status, messages.length]); // Rerun if session or status changes, or if messages get populated

  // --- Scroll to Bottom ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // Scroll whenever messages change

  // --- Helper to add messages sequentially with delay and loading ---
  const addAssistantChunksSequentially = useCallback(async (
    chunks: string[],
    initialLoaderId: string // Accept the ID of the loader to remove first
    ) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== initialLoaderId));

      const assistantMessages: Message[] = chunks.map(chunk => ({
        id: uuidv4(),
        role: 'assistant',
        content: chunk,
        timestamp: new Date(), // Consistent timestamp for the logical response
        isLoading: false,
      }));

      for (let i = 0; i < assistantMessages.length; i++) {
        const currentChunkMessage = assistantMessages[i];

        // Add the current actual chunk
        setMessages((prev) => [...prev, currentChunkMessage]);

        // If this isn't the last chunk, calculate delay, show loader, wait, remove loader
        if (i < assistantMessages.length - 1) {
          const wordCount = countWords(currentChunkMessage.content);
          const delay = calculateReadTimeMs(wordCount, 180, MESSAGE_DELAY_MS); // 180 WPM, adjust as needed
          const chunkLoaderId = `chunk-loader-${i}`; // Unique ID for this specific pause

          setMessages((prev) => [
            ...prev,
            { id: chunkLoaderId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true }
          ]);

          // Wait
          await new Promise(resolve => setTimeout(resolve, delay));

          setMessages((prev) => prev.filter((msg) => msg.id !== chunkLoaderId));
        }
      }
  }, []);

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

    // Show Initial loading message
    const initialLoaderId = uuidv4();
    setMessages((prev) => [
      ...prev,
      { id: initialLoaderId, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
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
      
      // Split the response into chunks if it's too long
      const responseChunks = splitLongMessage(data.response, MAX_CHUNK_LENGTH);
      // Call the sequential display helper
      await addAssistantChunksSequentially(responseChunks, initialLoaderId);
    } catch (err: unknown) {
      console.error("API Error:", err);
      let errorMessage: string;
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = "Gagal menghubungi Aika. Terjadi kesalahan tidak dikenal.";
      }
      toast.error(errorMessage);
      setError(errorMessage);
      setMessages((prev) => prev.filter((msg) => msg.id !== initialLoaderId));
    } finally {
      setIsLoading(false);
    }
  }, [session, sessionId, addAssistantChunksSequentially]); // Add sessionId dependency

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

    // Add user message *before* clearing input and calling API
    // Add it to a temporary state that includes the new message for history calculation
    const messagesWithUser = [...messages, newUserMessage];
    setMessages(messagesWithUser);
    setInputValue(''); // Clear input now

    const historyForApi: ApiMessage[] = messagesWithUser // Use the state *with* the new user message
      .filter(msg => msg.role !== 'system')
      .map((msg) => ({ role: msg.role, content: msg.content }));

    // processMessage will handle setting isLoading true/false and adding assistant messages
    await processMessage({ message: userMessageContent, history: historyForApi });

  }, [inputValue, isLoading, messages, processMessage]); // Dependencies updated

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

    // Add system message before calling API
    const messagesWithSystem = [...messages, systemMessage];
    setMessages(messagesWithSystem);
    setCurrentMode(`module:${moduleId}`);

    const historyForApi: ApiMessage[] = messagesWithSystem // Use state including system message to find previous history
       .filter(msg => msg.role !== 'system') // Still filter system for API call
       .map((msg) => ({ role: msg.role, content: msg.content }));

     await processMessage({
         event: { type: 'start_module', module_id: moduleId },
         history: historyForApi.length > 0 ? historyForApi : undefined,
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
    // sessionId, // Expose if needed
  };
}