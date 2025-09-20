import { create } from 'zustand';

// Define the type for media devices
interface MediaDevice {
  deviceId: string;
  label: string;
  kind: string;
}

// Define the type for speech synthesis voices
interface SpeechSynthesisVoice {
  name: string;
  lang: string;
  voiceURI: string;
}

type LiveTalkState = {
  isLiveTalkActive: boolean;
  isListening: boolean;
  isAikaSpeaking: boolean;
  conversation: { speaker: 'user' | 'aika'; text: string }[];
  microphones: MediaDevice[];
  speakers: MediaDevice[];
  voices: SpeechSynthesisVoice[];
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  selectedVoice: string | null;
  spectrogramData: number[];
  toggleLiveTalk: () => void;
  setUserSpeaking: (status: boolean) => void;
  setAikaSpeaking: (status: boolean) => void;
  addMessage: (message: { speaker: 'user' | 'aika'; text: string }) => void;
  setMicrophones: (devices: MediaDevice[]) => void;
  setSpeakers: (devices: MediaDevice[]) => void;
  setVoices: (voices: SpeechSynthesisVoice[]) => void;
  setSelectedMicrophone: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
  setSelectedVoice: (voiceURI: string) => void;
  setSpectrogramData: (data: number[]) => void;
};

export const useLiveTalkStore = create<LiveTalkState>((set) => ({
  isLiveTalkActive: false,
  isListening: false,
  isAikaSpeaking: false,
  conversation: [],
  microphones: [],
  speakers: [],
  voices: [],
  selectedMicrophone: null,
  selectedSpeaker: null,
  selectedVoice: null,
  spectrogramData: Array(16).fill(0),
  toggleLiveTalk: () => set((state) => ({ isLiveTalkActive: !state.isLiveTalkActive })),
  setUserSpeaking: (status) => set({ isListening: status }),
  setAikaSpeaking: (status) => set({ isAikaSpeaking: status }),
  addMessage: (message) => set((state) => ({ conversation: [...state.conversation, message] })),
  setMicrophones: (devices) => set({ microphones: devices }),
  setSpeakers: (devices) => set({ speakers: devices }),
  setVoices: (voices) => set({ voices }),
  setSelectedMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),
  setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),
  setSelectedVoice: (voiceURI) => set({ selectedVoice: voiceURI }),
  setSpectrogramData: (data) => set({ spectrogramData: data }),
}));
