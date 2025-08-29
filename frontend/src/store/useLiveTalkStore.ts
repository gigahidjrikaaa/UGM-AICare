import { create } from 'zustand';

// Define the type for media devices
interface MediaDevice {
  deviceId: string;
  label: string;
  kind: string;
}

type LiveTalkState = {
  isLiveTalkActive: boolean;
  isListening: boolean;
  isAikaSpeaking: boolean;
  conversation: { speaker: 'user' | 'aika'; text: string }[];
  microphones: MediaDevice[];
  speakers: MediaDevice[];
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  toggleLiveTalk: () => void;
  setUserSpeaking: (status: boolean) => void;
  setAikaSpeaking: (status: boolean) => void;
  addMessage: (message: { speaker: 'user' | 'aika'; text: string }) => void;
  setMicrophones: (devices: MediaDevice[]) => void;
  setSpeakers: (devices: MediaDevice[]) => void;
  setSelectedMicrophone: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
};

export const useLiveTalkStore = create<LiveTalkState>((set) => ({
  isLiveTalkActive: false,
  isListening: false,
  isAikaSpeaking: false,
  conversation: [],
  microphones: [],
  speakers: [],
  selectedMicrophone: null,
  selectedSpeaker: null,
  toggleLiveTalk: () => set((state) => ({ isLiveTalkActive: !state.isLiveTalkActive })),
  setUserSpeaking: (status) => set({ isListening: status }),
  setAikaSpeaking: (status) => set({ isAikaSpeaking: status }),
  addMessage: (message) => set((state) => ({ conversation: [...state.conversation, message] })),
  setMicrophones: (devices) => set({ microphones: devices }),
  setSpeakers: (devices) => set({ speakers: devices }),
  setSelectedMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),
  setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),
}));