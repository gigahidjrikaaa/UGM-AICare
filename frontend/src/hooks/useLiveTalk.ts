import { useEffect, useRef, useState } from 'react';
import { useLiveTalkStore } from '../store/useLiveTalkStore';
import { type Message as CoreMessage } from '@/types/chat';

// Minimal Type definitions for Web Speech API to fix TypeScript errors
interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

// Augment the global Window interface
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseLiveTalkProps {
  onTranscriptReceived: (transcript: string) => void;
  onPartialTranscript: (transcript: string) => void;
  messages: CoreMessage[];
}

export const useLiveTalk = ({
  onTranscriptReceived,
  onPartialTranscript,
  messages,
}: UseLiveTalkProps) => {
  const SpeechRecognition =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const {
    isLiveTalkActive,
    isAikaSpeaking,
    setUserSpeaking,
    setAikaSpeaking,
    setMicrophones,
    setSpeakers,
  } = useLiveTalkStore();

  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef(''); // To accumulate final transcript

  // Effect 0: Get media devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const spks = devices.filter((d) => d.kind === 'audiooutput');
        setMicrophones(mics);
        setSpeakers(spks);
      } catch (error) {
        console.error("Error enumerating media devices:", error);
      }
    };
    getDevices();
  }, [setMicrophones, setSpeakers]);

  // Effect 1: Create, configure, and tear down the recognition instance
  useEffect(() => {
    if (!SpeechRecognition) {
      console.error('Speech Recognition API is not supported in this browser.');
      return;
    }

    if (isLiveTalkActive) {
      const rec: SpeechRecognition = new SpeechRecognition();
      rec.lang = 'id-ID';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        isListeningRef.current = true;
        setUserSpeaking(true);
        finalTranscriptRef.current = ''; // Reset transcript on start
      };

      rec.onend = () => {
        isListeningRef.current = false;
        setUserSpeaking(false);
        // Send the final accumulated transcript if any
        if (finalTranscriptRef.current) {
          onTranscriptReceived(finalTranscriptRef.current);
        }
        onPartialTranscript(''); // Clear the partial transcript view

        // Check if we should restart recognition (e.g., after a pause)
        const shouldStillBeListening = 
          useLiveTalkStore.getState().isLiveTalkActive && 
          !useLiveTalkStore.getState().isAikaSpeaking;

        if (shouldStillBeListening) {
          setTimeout(() => {
            // Re-check condition in case state changed during timeout
            if (useLiveTalkStore.getState().isLiveTalkActive && !useLiveTalkStore.getState().isAikaSpeaking) {
              try {
                recognition?.start();
              } catch (e) {
                console.error("Error restarting recognition in onend:", e);
              }
            }
          }, 100);
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        isListeningRef.current = false;
        setUserSpeaking(false);
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        onPartialTranscript(finalTranscriptRef.current + interimTranscript);
      };

      setRecognition(rec);

      return () => {
        rec.abort();
        isListeningRef.current = false;
        setRecognition(null);
      };
    } else if (recognition) {
      recognition.abort();
      setRecognition(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveTalkActive, SpeechRecognition, setUserSpeaking, onTranscriptReceived, onPartialTranscript]);

  // Effect 2: The Controller - manages starting and stopping recognition
  useEffect(() => {
    if (!recognition) {
      return;
    }

    const shouldBeListening = isLiveTalkActive && !isAikaSpeaking;

    if (shouldBeListening && !isListeningRef.current) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Error starting speech recognition in controller:', e);
      }
    } else if (!shouldBeListening && isListeningRef.current) {
      recognition.stop();
    }
  }, [recognition, isLiveTalkActive, isAikaSpeaking]);

  // Effect 3: Text-to-Speech (Aika Speaking)
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
      // State change will trigger the controller effect to stop recognition
      const utterance = new SpeechSynthesisUtterance(
        lastMessage.content as string,
      );
      utterance.lang = 'id-ID';

      utterance.onstart = () => {
        setAikaSpeaking(true);
      };

      utterance.onend = () => {
        setAikaSpeaking(false);
        lastSpokenMessageIdRef.current = lastMessage.id;
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error('Speech synthesis error:', event.error);
        setAikaSpeaking(false); // Ensure state is reset on error
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [messages, isLiveTalkActive, setAikaSpeaking]);
};
