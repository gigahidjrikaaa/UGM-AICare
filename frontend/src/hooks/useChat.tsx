// src/hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react'; // Use client-side session hook

import type { Message, ChatMode } from '@/types/chat';
import type { ApiMessage, ChatRequestPayload, ChatResponsePayload } from '@/types/api';
import { sendMessage as sendApiMessage } from '@/services/api'; // Assuming api.ts exports this

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