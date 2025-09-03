import { useEffect, useRef, useState } from 'react';
import { useLiveTalkStore } from '../store/useLiveTalkStore';
import { type Message as CoreMessage } from '@/types/chat';
import { VAD, VADOptions } from '@ricky0123/vad-web';

// --- Constants ---
const STT_WEBSOCKET_URL = 'ws://localhost:8001/ws/stt'; // Placeholder for Whisper STT
const TTS_WEBSOCKET_URL = 'ws://localhost:8002/ws/tts'; // Placeholder for Fish Speech TTS

type SocketStatus = 'connecting' | 'connected' | 'disconnected';

// --- Helper Functions for Browser APIs ---

const getBrowserSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;
    return recognition;
  }
  return null;
};

const browserTextToSpeech = (text: string, selectedVoiceURI: string | null, onStart: () => void, onEnd: () => void, onError: (e: any) => void) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';

  if (selectedVoiceURI) {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onError;
  window.speechSynthesis.speak(utterance);
};


// --- The Main Hook ---

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
  const {
    isLiveTalkActive,
    isAikaSpeaking,
    setUserSpeaking,
    setAikaSpeaking,
    setMicrophones,
    setSpeakers,
    setVoices,
    selectedVoice,
  } = useLiveTalkStore();

  // --- Refs ---
  const sttSocketRef = useRef<WebSocket | null>(null);
  const ttsSocketRef = useRef<WebSocket | null>(null);
  const vadRef = useRef<VAD | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const browserRecognitionRef = useRef<SpeechRecognition | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  // --- State ---
  const [sttSocketStatus, setSttSocketStatus] = useState<SocketStatus>('connecting');
  const [ttsSocketStatus, setTtsSocketStatus] = useState<SocketStatus>('connecting');

  // --- Effects ---

  // Effect 0: Get media devices and voices
  useEffect(() => {
    const getDevicesAndVoices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const spks = devices.filter((d) => d.kind === 'audiooutput');
        setMicrophones(mics);
        setSpeakers(spks);

        // --- Get voices ---
        const updateVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          setVoices(voices);
        };
        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

      } catch (error) {
        console.error("Error enumerating media devices or voices:", error);
      }
    };
    getDevicesAndVoices();
  }, [setMicrophones, setSpeakers, setVoices]);

  // Effect 1: Setup WebSockets and VAD
  useEffect(() => {
    if (isLiveTalkActive) {
      // --- STT WebSocket ---
      const sttWs = new WebSocket(STT_WEBSOCKET_URL);
      sttSocketRef.current = sttWs;
      sttWs.onopen = () => setSttSocketStatus('connected');
      sttWs.onclose = () => setSttSocketStatus('disconnected');
      sttWs.onerror = () => setSttSocketStatus('disconnected');
      sttWs.onmessage = (event) => {
        const transcript = event.data;
        if (transcript) {
          onTranscriptReceived(transcript);
        }
      };

      // --- TTS WebSocket ---
      const ttsWs = new WebSocket(TTS_WEBSOCKET_URL);
      ttsSocketRef.current = ttsWs;
      ttsWs.onopen = () => setTtsSocketStatus('connected');
      ttsWs.onclose = () => setTtsSocketStatus('disconnected');
      ttsWs.onerror = () => setTtsSocketStatus('disconnected');
      ttsWs.onmessage = (event) => {
        // Assuming the TTS service sends back audio data
        const audioData = event.data;
        // Play the audio data
        // (This part needs more implementation depending on the audio format)
      };

      // --- VAD Setup ---
      const setupVAD = async () => {
        try {
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          const vadOptions: VADOptions = {
            onSpeechStart: () => setUserSpeaking(true),
            onSpeechEnd: (audio) => {
              setUserSpeaking(false);
              if (sttSocketStatus === 'connected' && sttSocketRef.current) {
                const pcm = new Int16Array(audio.length);
                for (let i = 0; i < audio.length; i++) {
                  pcm[i] = audio[i] * 32767;
                }
                sttSocketRef.current.send(pcm.buffer);
              }
            },
          };
          const vad = await VAD.create(vadOptions);
          vadRef.current = vad;
          vad.start();
        } catch (error) {
          console.error("Error setting up VAD:", error);
        }
      };

      if (sttSocketStatus === 'connected') {
        setupVAD();
      }

      return () => {
        sttWs.close();
        ttsWs.close();
        vadRef.current?.destroy();
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();
      };
    }
  }, [isLiveTalkActive, sttSocketStatus, onTranscriptReceived, setUserSpeaking]);

  // Effect 2: Fallback to Browser STT
  useEffect(() => {
    if (isLiveTalkActive && sttSocketStatus === 'disconnected') {
      console.log("Using browser STT as fallback.");
      const recognition = getBrowserSpeechRecognition();
      if (recognition) {
        browserRecognitionRef.current = recognition;
        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          onPartialTranscript(finalTranscript + interimTranscript);
          if (finalTranscript) {
            onTranscriptReceived(finalTranscript);
          }
        };
        recognition.onstart = () => setUserSpeaking(true);
        recognition.onend = () => setUserSpeaking(false);
        recognition.start();
      } else {
        console.error("Browser Speech Recognition is not supported.");
      }

      return () => {
        recognition?.stop();
      };
    }
  }, [isLiveTalkActive, sttSocketStatus, onPartialTranscript, onTranscriptReceived, setUserSpeaking]);


  // Effect 3: Text-to-Speech (with fallback)
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
      const text = lastMessage.content as string;

      const onStart = () => setAikaSpeaking(true);
      const onEnd = () => {
        setAikaSpeaking(false);
        lastSpokenMessageIdRef.current = lastMessage.id;
      };
      const onError = (e: any) => {
        console.error('TTS error:', e);
        setAikaSpeaking(false);
      };

      if (ttsSocketStatus === 'connected' && ttsSocketRef.current) {
        // Use WebSocket TTS
        console.log("Using WebSocket TTS.");
        ttsSocketRef.current.send(text);
        // The onmessage handler for the TTS socket will handle the audio playback
        // For now, we will just log it.
        onStart(); // We assume the audio will start playing immediately
        // We need a way to know when the audio has finished playing.
        // This depends on the TTS service implementation.
        // For now, we will just set Aika speaking to false after a timeout.
        setTimeout(() => onEnd(), 3000); // Placeholder
      } else {
        // Fallback to Browser TTS
        console.log("Using browser TTS as fallback.");
        browserTextToSpeech(text, selectedVoice, onStart, onEnd, onError);
      }
    }
  }, [messages, isLiveTalkActive, setAikaSpeaking, ttsSocketStatus, selectedVoice]);

};