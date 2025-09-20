import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveTalkStore } from "../store/useLiveTalkStore";
import { type Message as CoreMessage } from "@/types/chat";
import { MicVAD } from "@ricky0123/vad-web";

const STT_WEBSOCKET_URL = "ws://localhost:8001/ws/stt";
const TTS_WEBSOCKET_URL = "ws://localhost:8002/ws/tts";
const SPECTROGRAM_BAR_COUNT = 16;
const SPECTROGRAM_FRAME_INTERVAL_MS = 50;

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type ExtendedWindow = Window &
  typeof globalThis & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  };

type SocketStatus = "connecting" | "connected" | "disconnected";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getBrowserSpeechRecognition = () => {
  const speechWindow = window as ExtendedWindow;
  const SpeechRecognition =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;
    return recognition;
  }
  return null;
};

const browserTextToSpeech = (
  text: string,
  selectedVoiceURI: string | null,
  onStart: () => void,
  onEnd: () => void,
  onError: (e: unknown) => void,
) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";

  if (selectedVoiceURI) {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onError;
  window.speechSynthesis.speak(utterance);
};

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
    selectedMicrophone,
    setUserSpeaking,
    setAikaSpeaking,
    setMicrophones,
    setSpeakers,
    setVoices,
    selectedVoice,
    setSpectrogramData,
  } = useLiveTalkStore();

  const sttSocketRef = useRef<WebSocket | null>(null);
  const ttsSocketRef = useRef<WebSocket | null>(null);
  const micVadRef = useRef<MicVAD | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const browserRecognitionRef = useRef<SpeechRecognition | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [sttSocketStatus, setSttSocketStatus] = useState<SocketStatus>("disconnected");
  const [ttsSocketStatus, setTtsSocketStatus] = useState<SocketStatus>("disconnected");

  const cleanupAudioPipeline = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (error) {
        console.warn("Error disconnecting audio source node", error);
      }
      sourceNodeRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    if (micVadRef.current) {
      try {
        micVadRef.current.pause();
        if (
          micVadRef.current.audioContext &&
          micVadRef.current.audioContext.state !== "closed"
        ) {
          void micVadRef.current.audioContext.close();
        }
      } catch (error) {
        console.warn("Error shutting down VAD", error);
      }
      micVadRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;

    if (browserRecognitionRef.current) {
      try {
        browserRecognitionRef.current.stop();
      } catch (error) {
        console.warn("Error stopping speech recognition fallback", error);
      }
      browserRecognitionRef.current = null;
    }

    setUserSpeaking(false);
    setSpectrogramData(Array(SPECTROGRAM_BAR_COUNT).fill(0));
  }, [setSpectrogramData, setUserSpeaking]);

  useEffect(() => {
    const getDevicesAndVoices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((device) => device.kind === "audioinput");
        const spks = devices.filter((device) => device.kind === "audiooutput");
        setMicrophones(mics);
        setSpeakers(spks);

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

  useEffect(() => {
    if (!isLiveTalkActive) {
      cleanupAudioPipeline();

      if (sttSocketRef.current) {
        sttSocketRef.current.close();
        sttSocketRef.current = null;
      }

      if (ttsSocketRef.current) {
        ttsSocketRef.current.close();
        ttsSocketRef.current = null;
      }

      setSttSocketStatus("disconnected");
      setTtsSocketStatus("disconnected");
      return;
    }

    setSttSocketStatus("connecting");
    setTtsSocketStatus("connecting");

    const sttWs = new WebSocket(STT_WEBSOCKET_URL);
    sttSocketRef.current = sttWs;

    sttWs.onopen = () => setSttSocketStatus("connected");
    sttWs.onclose = () => setSttSocketStatus("disconnected");
    sttWs.onerror = () => setSttSocketStatus("disconnected");
    sttWs.onmessage = (event) => {
      const transcript = event.data as string;
      if (transcript) {
        onTranscriptReceived(transcript);
      }
    };

    const ttsWs = new WebSocket(TTS_WEBSOCKET_URL);
    ttsSocketRef.current = ttsWs;

    ttsWs.onopen = () => setTtsSocketStatus("connected");
    ttsWs.onclose = () => setTtsSocketStatus("disconnected");
    ttsWs.onerror = () => setTtsSocketStatus("disconnected");
    ttsWs.onmessage = () => {
      // TODO: Handle audio frames from TTS service when available.
    };

    return () => {
      sttWs.close();
      ttsWs.close();
      sttSocketRef.current = null;
      ttsSocketRef.current = null;
      setSttSocketStatus("disconnected");
      setTtsSocketStatus("disconnected");
    };
  }, [cleanupAudioPipeline, isLiveTalkActive, onTranscriptReceived]);

  useEffect(() => {
    if (!isLiveTalkActive) {
      return;
    }

    let cancelled = false;

    const initialiseAudioPipeline = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;
        sourceNode.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        dataArrayRef.current = dataArray;

        let lastFrameTimestamp = 0;
        const renderSpectrogram = (timestamp: number) => {
          if (!analyserRef.current || !dataArrayRef.current) {
            rafRef.current = requestAnimationFrame(renderSpectrogram);
            return;
          }

          if (timestamp - lastFrameTimestamp >= SPECTROGRAM_FRAME_INTERVAL_MS) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            const sliceSize = Math.max(
              1,
              Math.floor(dataArrayRef.current.length / SPECTROGRAM_BAR_COUNT),
            );
            const bars: number[] = [];
            for (let i = 0; i < SPECTROGRAM_BAR_COUNT; i += 1) {
              const sliceStart = i * sliceSize;
              let sum = 0;
              let count = 0;
              for (let j = 0; j < sliceSize && sliceStart + j < dataArrayRef.current.length; j += 1) {
                sum += dataArrayRef.current[sliceStart + j];
                count += 1;
              }
              const average = count > 0 ? sum / count : 0;
              bars.push(clamp01(average / 255));
            }
            setSpectrogramData(bars);
            lastFrameTimestamp = timestamp;
          }

          rafRef.current = requestAnimationFrame(renderSpectrogram);
        };

        rafRef.current = requestAnimationFrame(renderSpectrogram);

        const vad = await MicVAD.new({
          stream,
          onSpeechStart: () => setUserSpeaking(true),
          onVADMisfire: () => setUserSpeaking(false),
          onSpeechEnd: (audio) => {
            setUserSpeaking(false);
            if (
              sttSocketRef.current &&
              sttSocketRef.current.readyState === WebSocket.OPEN &&
              audio.length > 0
            ) {
              const pcm = new Int16Array(audio.length);
              for (let i = 0; i < audio.length; i += 1) {
                const sample = Math.max(-1, Math.min(1, audio[i]));
                pcm[i] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
              }
              try {
                sttSocketRef.current.send(pcm.buffer);
              } catch (error) {
                console.error("Error sending audio frame to STT socket", error);
              }
            }
          },
        });

        if (cancelled) {
          vad.pause();
          if (vad.audioContext && vad.audioContext.state !== "closed") {
            void vad.audioContext.close();
          }
          return;
        }

        micVadRef.current = vad;
        vad.start();
      } catch (error) {
        console.error("Error setting up Live Talk audio pipeline:", error);
        cleanupAudioPipeline();
      }
    };

    initialiseAudioPipeline();

    return () => {
      cancelled = true;
      cleanupAudioPipeline();
    };
  }, [cleanupAudioPipeline, isLiveTalkActive, selectedMicrophone, setUserSpeaking, setSpectrogramData]);

  useEffect(() => {
    if (isLiveTalkActive && sttSocketStatus === "disconnected") {
      const recognition = getBrowserSpeechRecognition();
      if (recognition) {
        browserRecognitionRef.current = recognition;
        recognition.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
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

        return () => {
          recognition.stop();
        };
      }

      console.error("Browser Speech Recognition is not supported.");
    }
  }, [isLiveTalkActive, sttSocketStatus, onPartialTranscript, onTranscriptReceived, setUserSpeaking]);

  useEffect(() => {
    if (!isLiveTalkActive || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage.role === "assistant" &&
      lastMessage.id !== lastSpokenMessageIdRef.current &&
      lastMessage.content
    ) {
      const text = lastMessage.content as string;

      const onStart = () => setAikaSpeaking(true);
      const onEnd = () => {
        setAikaSpeaking(false);
        lastSpokenMessageIdRef.current = lastMessage.id;
      };
      const onError = (error: unknown) => {
        console.error("TTS error:", error);
        setAikaSpeaking(false);
      };

      if (ttsSocketStatus === "connected" && ttsSocketRef.current) {
        try {
          ttsSocketRef.current.send(text);
          onStart();
          window.setTimeout(onEnd, 3000);
        } catch (error) {
          console.error("Error sending text to TTS socket:", error);
          browserTextToSpeech(text, selectedVoice, onStart, onEnd, onError);
        }
      } else {
        browserTextToSpeech(text, selectedVoice, onStart, onEnd, onError);
      }
    }
  }, [messages, isLiveTalkActive, setAikaSpeaking, ttsSocketStatus, selectedVoice]);
};


