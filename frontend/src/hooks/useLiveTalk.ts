import { useEffect, useRef } from 'react';
import { useLiveTalkStore } from '../store/useLiveTalkStore';
import { type Message as CoreMessage } from '@/types/chat';

// Define a more specific type for the window object to include SpeechRecognition APIs
interface WindowWithSpeech extends Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SpeechRecognition: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webkitSpeechRecognition: any;
}

interface UseLiveTalkProps {
  onTranscriptReceived: (transcript: string) => void;
  messages: CoreMessage[];
}

export const useLiveTalk = ({ onTranscriptReceived, messages }: UseLiveTalkProps) => {
  const SpeechRecognition = typeof window !== 'undefined' &&
    ((window as unknown as WindowWithSpeech).SpeechRecognition || (window as unknown as WindowWithSpeech).webkitSpeechRecognition);

  const {
    isLiveTalkActive,
    setUserSpeaking,
    setAikaSpeaking,
  } = useLiveTalkStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  // Effect for Speech-to-Text (User Speaking)
  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech Recognition API is not supported in this browser.");
      return;
    }

    if (isLiveTalkActive) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.lang = 'id-ID';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setUserSpeaking(true);
      };

      recognition.onend = () => {
        setUserSpeaking(false);
        // Restart recognition if live talk is still active
        if (useLiveTalkStore.getState().isLiveTalkActive) {
          recognition.start();
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === "aborted") {
          // This is often expected when stopping recognition programmatically
          console.warn("Speech recognition aborted (expected behavior).");
        } else {
          console.error("Speech recognition error:", event.error);
        }
        setUserSpeaking(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (transcript) {
          onTranscriptReceived(transcript);
        }
      };

      recognition.start();
    } else {
      recognitionRef.current?.abort();
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [isLiveTalkActive, onTranscriptReceived, setUserSpeaking, SpeechRecognition]);

  // Effect for Text-to-Speech (Aika Speaking)
  useEffect(() => {
    if (!isLiveTalkActive || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage.role === 'assistant' &&
      lastMessage.id !== lastSpokenMessageIdRef.current &&
      lastMessage.content
    ) {
      // Stop listening to user while Aika is speaking
      recognitionRef.current?.stop();

      const utterance = new SpeechSynthesisUtterance(lastMessage.content as string);
      utterance.lang = 'id-ID';

      utterance.onstart = () => {
        setAikaSpeaking(true);
      };

      utterance.onend = () => {
        setAikaSpeaking(false);
        lastSpokenMessageIdRef.current = lastMessage.id;
        // Resume listening after Aika has finished speaking
        if (useLiveTalkStore.getState().isLiveTalkActive && recognitionRef.current && !recognitionRef.current.listening) {
          recognitionRef.current.start();
        }
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      utterance.onerror = (event: any) => {
        console.error("Speech synthesis error:", event.error);
        setAikaSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [messages, isLiveTalkActive, setAikaSpeaking]);
};