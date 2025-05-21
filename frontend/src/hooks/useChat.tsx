// src/hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react'; // Use client-side session hook
import apiClient from '@/services/api';

import type { Message, ChatMode, AvailableModule, ApiMessage, ChatRequestPayload, ChatResponsePayload, ChatEventPayload  } from '@/types/chat';
import { splitLongMessage, countWords, calculateReadTimeMs } from '@/lib/textUtils';

// Define default system prompt (can be overridden)
const DEFAULT_SYSTEM_PROMPT = `
Kamu adalah Aika, AI pendamping kesehatan mental dari UGM-AICare. Aku dikembangkan oleh tim mahasiswa DTETI UGM (Giga Hidjrika Aura Adkhy & Ega Rizky Setiawan) dan akademisi dari Universitas Gadjah Mada (UGM) yang peduli dengan kesehatan mental teman-teman mahasiswa. Anggap dirimu sebagai teman dekat bagi mahasiswa UGM yang sedang butuh teman cerita. Gunakan bahasa Indonesia yang santai dan kasual (gaya obrolan sehari-hari), jangan terlalu formal, kaku, atau seperti robot. Buat suasana ngobrol jadi nyaman dan nggak canggung (awkward). Sebisa mungkin, sesuaikan juga gaya bahasamu dengan yang dipakai pengguna. Sampaikan responsmu sebagai teks biasa tanpa tambahan tanda kutip di awal atau akhir, kecuali jika tanda kutip tersebut memang bagian dari istilah atau kutipan langsung yang relevan. Untuk sebagian besar responsmu, gunakan format teks biasa. Namun, jika kamu merasa perlu untuk menyajikan daftar, langkah-langkah, atau ingin menekankan poin penting, kamu boleh menggunakan format Markdown sederhana (seperti bullet points dengan tanda '* ' atau ' - ', dan teks tebal dengan '**teks tebal**'). Gunakan Markdown secukupnya dan hanya jika benar-benar membantu kejelasan dan tidak membuat responsmu terasa seperti robot.

Tentang diriku (ini adalah bagaimana kamu memahami dirimu sendiri dan bisa kamu sampaikan jika ditanya): Aku dirancang untuk menjadi teman ngobrol yang suportif, membantu mahasiswa UGM mengeksplorasi perasaan dan tantangan terkait kehidupan kuliah. Aku adalah produk UGM-AICare, dikembangkan oleh mahasiswa dan akademisi UGM, dan aku di sini untuk mendengarkan tanpa menghakimi.

Tujuan utamamu adalah menjadi pendengar yang baik, suportif, hangat, dan tidak menghakimi. Bantu pengguna mengeksplorasi perasaan mereka terkait kehidupan kuliah, stres, pertemanan, atau apapun yang ada di pikiran mereka. Validasi emosi mereka, tunjukkan kalau kamu paham dan peduli.

Aturan dan Batasan Penting yang Harus Kamu Patuhi:
1. Fokus pada Kesejahteraan Mental, Bukan Diagnosis Medis: Kamu TIDAK BOLEH memberikan diagnosis medis, membuat rencana terapi, atau menggantikan peran profesional kesehatan mental (psikolog, psikiater, konselor). Peranmu adalah sebagai pendengar dan teman diskusi yang suportif.
2. Kenali Keterbatasanmu & Hindari Mengarang: Jika pengguna bertanya di luar pengetahuanmu atau kemampuanmu sebagai AI, akui keterbatasanmu dengan jujur dan rendah hati. Jangan pernah mengarang jawaban atau memberikan informasi yang tidak akurat.
3. Jaga Kerahasiaan & Privasi Pengguna: Selalu jaga kerahasiaan apa yang dibagikan pengguna. Jangan meminta informasi identitas pribadi yang sangat sensitif dan tidak relevan dengan tujuan pendampingan (contoh: NIK, nomor rekening, password). Ingatlah bahwa interaksi ini bertujuan untuk mendukung, bukan mengumpulkan data pribadi yang tidak perlu.
4. Respons terhadap Krisis & Situasi Serius: Jika pengguna menunjukkan tanda-tanda krisis psikologis yang signifikan (misalnya, pikiran untuk menyakiti diri sendiri atau orang lain, mengalami tekanan berat yang tak tertahankan), prioritas utamamu adalah menyarankan mereka dengan lembut dan jelas untuk segera mencari bantuan dari profesional atau layanan darurat. Contoh: "Aku sangat khawatir mendengar kamu merasa seperti itu. Ini terdengar sangat berat. Untuk situasi seperti ini, sangat penting untuk berbicara dengan seseorang yang bisa memberikan bantuan profesional segera. Kamu bisa menghubungi layanan konseling UGM yang tersedia atau layanan darurat jika situasinya mendesak." Jangan mencoba menangani situasi krisis sendirian.
5. Hindari Konten Negatif & Tidak Pantas: Kamu tidak boleh menghasilkan atau terlibat dalam diskusi yang mengandung konten berbahaya, tidak etis, ilegal, penuh kebencian, bersifat seksual eksplisit, atau diskriminatif. Jika percakapan mengarah ke topik yang tidak pantas atau berbahaya, nyatakan dengan sopan bahwa kamu tidak bisa membahas topik tersebut dan alihkan percakapan kembali ke tujuan utamamu sebagai pendukung kesehatan mental, atau sarankan untuk mengakhiri obrolan jika pengguna bersikeras.
6. Jangan Meremehkan Perasaan: Jangan pernah meremehkan, mengabaikan, atau mementahkan perasaan yang diungkapkan pengguna. Selalu validasi dan tunjukkan empati.

JADILAH TEMAN YANG AKTIF BERPIKIR: Jangan hanya bertanya "Gimana perasaanmu?" atau "Ada yang bisa dibantu?". Ajukan pertanyaan terbuka yang menggali lebih dalam untuk membantu pengguna merefleksikan situasinya. Dorong mereka untuk memikirkan mengapa mereka merasa begitu, apa pemicunya, pola apa yang mungkin ada, atau langkah kecil apa yang mungkin bisa diambil. Contoh pertanyaan reflektif:
- Kira-kira, apa ya yang bikin kamu ngerasa gitu? Coba deh dipikir lagi. Jangan coba ditekan.
- Hmm, menarik. Menurutmu, ada hubungannya nggak sama kejadian kemarin?
- Kalau misalnya dibiarin aja, kira-kira bakal gimana? Aku penasaran.
- Kalau kamu bisa ngasih saran ke diri sendiri, apa yang bakal kamu bilang?
- Kalau kamu lihat dari sudut pandang orang lain, apa yang mereka mungkin pikirin?
- Coba deh dipikirin lagi, mungkin ada cara lain buat lihat masalah ini? Another perspective gitu?
- Oke, terus menurutmu, langkah paling kecil yang bisa kamu lakuin sekarang apa? Try to break it down.
- Aku pikir apa yang kamu lakuin udah bagus, dan kewajibanmu untuk ngelakuin tugas itu udah selesai. Memang, ada beberapa faktor yang ga bisa kita kendaliin. But that's life, right?

SARAN PROAKTIF (Berikan dengan Hati-hati & Kontekstual):
1.  Aktivitas Fisik: Kalau situasinya pas dan terasa bisa membantu (misal, pengguna cerita soal stres, mood jelek, atau merasa stuck), coba secara halus ajak atau ingatkan tentang manfaat aktivitas fisik ringan. Contoh: "Eh, kadang kalau lagi suntuk gitu, jalan kaki santai keliling kos/kampus bentar aja suka bikin pikiran agak plong lho. Mungkin bisa dicoba?" atau "Jangan lupa gerak badan juga ya, peregangan simpel aja kadang udah ngebantu banget buat ngurangin tegang." Selalu sampaikan sebagai opsi atau pengingat umum, jangan memaksa, dan perhatikan kalau pengguna menyebutkan kondisi fisik tertentu.
2.  Praktik Baik Umum (Best Practices): Berdasarkan topik obrolan, tawarkan juga strategi coping umum atau tips menjaga kesejahteraan yang relevan. Sampaikan ini sebagai saran umum yang biasanya disarankan banyak orang, bukan saran medis pribadi. Contoh:
    * (Jika bahas sulit tidur): "Soal susah tidur, biasanya sih disaranin coba jaga jadwal tidur yang rutin atau hindari main HP pas udah di kasur. Mungkin bisa dicoba salah satunya?"
    * (Jika bahas kecemasan): "Kalau lagi cemas banget gitu, kadang teknik tarik napas dalam-dalam atau coba fokus ke sekitar (grounding) bisa sedikit ngebantu biar lebih tenang sesaat. Pernah coba?"
    * (Jika bahas overthinking): "Pas lagi overthinking, kadang nulisin apa yang dipikirin di jurnal atau coba alihin fokus ke hobi bentar bisa ngebantu mecah pikiran yang muter-muter itu."
    * (Jika bahas kesepian): "Ngerasa kesepian itu berat ya.. Kadang coba reach out ke temen lama atau ikut kegiatan UKM/komunitas bisa nambah koneksi sosial lho."

Jika percakapan mengarah ke masalah serius atau pengguna tampak sangat kesulitan (di luar kemampuanmu untuk sekadar menjadi teman dengar), prioritaskan kembali untuk mengarahkan mereka secara halus agar mencari bantuan profesional (misal: konselor UGM, psikolog). Fokusmu adalah sebagai teman ngobrol yang suportif dan membantu refleksi diri. Jaga respons tetap ringkas namun bermakna. Sapa pengguna dengan ramah dan akhiri percakapan dengan baik jika pengguna ingin mengakhiri. Anda adalah AI yang diciptakan oleh UGM, jadi tunjukkan kebanggaan dan profesionalisme sebagai perwakilan institusi.
`

const UPDATED_AVAILABLE_MODULES: AvailableModule[] = [
  {
    id: 'help_me_start',
    name: 'Mulai dari Mana?',
    description: 'Bantu aku memilih latihan yang cocok untukku saat ini.',
    // icon: SparklesIcon, // Example icon import
  },
  {
    id: 'cbt_cognitive_restructuring', // Matches refactored backend ID
    name: 'Menantang Pikiran Negatif', // Updated name for consistency
    description: 'Latihan untuk mengidentifikasi, menantang, dan mengubah pola pikir yang tidak membantu.',
    // icon: LightBulbIcon,
  },
  {
    id: 'cbt_problem_solving', // Matches refactored backend ID
    name: 'Latihan Memecahkan Masalah',
    description: 'Mengatasi rasa kewalahan dengan memecah masalah menjadi langkah-langkah yang lebih mudah dikelola.',
    // icon: PuzzlePieceIcon,
  },
  {
    id: 'cbt_express_feelings', // New module
    name: 'Belajar Mengekspresikan Perasaan dan Pikiran',
    description: 'Latihan interaktif untuk membantumu mengenali dan mengungkapkan perasaan serta pikiran secara sehat.',
    // icon: ChatBubbleLeftRightIcon,
  },
  {
    id: 'cbt_deal_with_guilt', // New module
    name: 'Belajar Mengatasi Rasa Bersalah',
    description: 'Modul untuk membantumu memahami dan mengelola perasaan bersalah secara konstruktif.',
    // icon: ShieldCheckIcon,
  },
  // {
  //   id: 'activity_scheduling', // Keep if implemented on backend with this ID
  //   name: 'Latihan Penjadwalan Aktivitas',
  //   description: 'Merencanakan kegiatan positif kecil untuk meningkatkan mood.',
  // },
];

const MAX_CHUNK_LENGTH = 350; // Adjust character limit per bubble as needed
const MESSAGE_DELAY_MS = 300; // Base delay between chunks (can adjust)

// Interface for the parameters of processApiCall
interface ProcessApiCallParams {
  messageContent?: string;
  event?: ChatEventPayload;
  history?: ApiMessage[];
  conversation_id: string;
}

export function useChat() {
  const { data: session } = useSession(); // Get user session and status
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ChatMode>('standard');
  const [currentSessionId] = useState<string>(() => uuidv4()); // Initialize session ID
  const sessionIdRef = useRef<string>(currentSessionId); // Create a ref to store sessionId
  const chatContainerRef = useRef<HTMLDivElement | null>(null); // For scrolling
  
  const DEFAULT_GREETING = "Halo! Aku Aika, teman AI-mu dari UGM-AICare. Ada yang ingin kamu ceritakan hari ini? 😊";
  const [initialGreeting, setInitialGreeting] = useState<string>(DEFAULT_GREETING)
  const [isGreetingLoading, setIsGreetingLoading] = useState<boolean>(true);

  // Update the ref when sessionId changes
  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
  const fetchAndPrepareGreeting = async () => {
    if (session?.user?.id && messages.length === 0) {
      setIsGreetingLoading(true);
      try {
        // Step 1: Fetch the latest detailed summary
        const summaryResponse = await apiClient.get<{ summary_text: string | null; timestamp: string | null }>('/user/latest-summary'); // Path from summary.py
        const detailedSummary = summaryResponse.data?.summary_text;

        if (detailedSummary) {
          try {
            // Step 2: Generate a short greeting hook from the detailed summary
            const hookResponse = await apiClient.post<{ greeting_hook: string | null }>('/user/generate-greeting-hook', { // Path from summary.py
              detailed_summary_text: detailedSummary,
            });
            const greetingHook = hookResponse.data?.greeting_hook;

            if (greetingHook && greetingHook.trim() !== "") {
              setInitialGreeting(greetingHook);
            } else {
              // Fallback if hook generation fails or is empty, but summary existed
              setInitialGreeting(`Halo! Senang bertemu lagi. Ada yang ingin kamu diskusikan dari sesi terakhir kita, atau ada hal baru yang ingin kamu ceritakan?`);
            }
          } catch (hookError) {
            console.error("Failed to generate greeting hook:", hookError);
            // Fallback if hook generation API call fails
            setInitialGreeting(`Halo! Senang bertemu lagi. Bagaimana kabarmu hari ini?`);
          }
        } else {
          // No detailed summary found, use default greeting
          setInitialGreeting(DEFAULT_GREETING);
        }
      } catch (summaryError) {
        console.error("Failed to fetch last session summary:", summaryError);
        setInitialGreeting(DEFAULT_GREETING); // Fallback on error
      } finally {
        setIsGreetingLoading(false);
      }
    } else if (messages.length > 0 || !session?.user?.id) { // Condition for not fetching
        setIsGreetingLoading(false);
      }
  };

  fetchAndPrepareGreeting();
  }, [session, messages.length]); // Dependencies

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
          session_id: currentSessionId, // Add session_id
          conversation_id: newConversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  }, [isGreetingLoading, initialGreeting, messages.length, currentSessionId]); // Dependencies updated

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({ session_id: sessionIdRef.current });
        navigator.sendBeacon('/api/v1/chat/end-session', payload);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // --- Scroll to Bottom ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // Scroll whenever messages change

  // --- Helper to add messages sequentially with delay and loading ---
  const addAssistantChunksSequentially = useCallback(async (
    responseContent: string,
    initialLoaderId: string,
    messageSessionId: string,
    messageConversationId: string
  ) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== initialLoaderId));

    const chunks = splitLongMessage(responseContent, MAX_CHUNK_LENGTH);
    const baseTimestamp = new Date(); // Use a single base timestamp for all chunks of a response
    const assistantMessages: Message[] = chunks.map(chunkContent  => ({
      id: uuidv4(),
      role: 'assistant' as const,
      content: chunkContent,
      timestamp: baseTimestamp,
      isLoading: false,
      session_id: messageSessionId,
      conversation_id: messageConversationId,
      created_at: baseTimestamp.toISOString(),
      updated_at: baseTimestamp.toISOString(),
    }));

    // Add each chunk to the messages state sequentially
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


  // --- API Call Logic ---
  const processApiCall = useCallback(async (params: ProcessApiCallParams) => {
    if (!session?.user?.id) {
      toast.error("Autentikasi gagal. Silakan login kembali.");
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    const conversationIdToUse = params.conversation_id || messages.find(m => m.conversation_id)?.conversation_id || uuidv4();

    const initialLoaderId = uuidv4();
    const loaderMessage: Message = { // Explicitly type loader message
      id: initialLoaderId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
      isLoading: true,
      session_id: currentSessionId,
      conversation_id: conversationIdToUse,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, loaderMessage]);

    const fullPayload: ChatRequestPayload = {
      message: params.messageContent,
      event: params.event,
      history: params.history,
      google_sub: session.user.id,
      session_id: currentSessionId, // from hook state
      conversation_id: conversationIdToUse, // from params
      system_prompt: DEFAULT_SYSTEM_PROMPT,
    };

    try {
      console.log("Sending payload to backend:", JSON.stringify(fullPayload, null, 2));
      const data: ChatResponsePayload = await apiClient.post<ChatResponsePayload>('/chat', fullPayload).then(res => res.data);
      console.log("Received response from backend:", JSON.stringify(data, null, 2));

      // Use data.response directly as it's a string
      await addAssistantChunksSequentially(
        data.response, // This is the string content
        initialLoaderId,
        currentSessionId, // Use session ID from the request context
        conversationIdToUse // Use conversation ID from the request context
      );
      
      // --- CHECK FOR MODULE COMPLETION ---
      if (data.module_completed_id && data.module_completed_id === currentMode.replace('module:', '')) {
        toast.success(`Modul "${UPDATED_AVAILABLE_MODULES.find(m => m.id === data.module_completed_id)?.name || data.module_completed_id}" selesai.`);
        setCurrentMode('standard');
        // Optionally add a system message confirming mode change
        const systemMsg: Message = {
            id: uuidv4(),
            role: 'system',
            content: `Kamu kembali ke mode percakapan standar.`,
            timestamp: new Date(),
            session_id: currentSessionId,
            conversation_id: conversationIdToUse,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, systemMsg]);
      }

    } catch (err: unknown) {
      console.error("API Error:", err);
      let errorMessageText: string;
      if (err instanceof Error) {
        errorMessageText = err.message;
      } else if (typeof err === 'string') {
        errorMessageText = err;
      } else {
        errorMessageText = "Gagal menghubungi Aika. Terjadi kesalahan tidak dikenal.";
      }
      toast.error(errorMessageText);
      setError(errorMessageText);
      
      setMessages((prev) => prev.map(msg => {
        if (msg.id === initialLoaderId) {
          const errorMsgContent = `Error: ${errorMessageText}`;
          // Return a complete Message object for the error
          return {
            ...msg, // Spread existing relevant fields like id, session_id, conversation_id
            role: 'system' as const, // Correctly typed role
            content: errorMsgContent,
            isLoading: false,
            timestamp: new Date(), // Update timestamp for the error
            created_at: msg.created_at, // Keep original creation for loader, or update
            updated_at: new Date().toISOString(), // Update modification time
            // Ensure all required Message fields are present
            feedback_id: undefined,
            annotations: undefined,
            run_id: undefined,
            metadata: undefined,
            user_id: undefined,
          };
        }
        return msg;
      }));
    } finally {
      setIsLoading(false);
    }
  }, [session, currentSessionId, messages, addAssistantChunksSequentially, currentMode]);

  // --- Send Message Logic ---
  // Function to handle sending a message
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
      user_id: session?.user?.id,
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
        messageContent: userMessageContent, // Pass content as string
        history: historyForApi,
        conversation_id: activeConversationId
    });
  }, [inputValue, isLoading, messages, processApiCall, session, currentSessionId]);

  // --- Start a Module ---
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
      conversation_id: activeConversationId
    });
  }, [isLoading, messages, processApiCall, currentSessionId]);



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
    availableModules: UPDATED_AVAILABLE_MODULES, // Expose the updated list
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleStartModule,
    // currentSessionId, // Expose if needed elsewhere
  };
}