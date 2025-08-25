
import { create } from 'zustand';

type LiveTalkState = {
  isLiveTalkActive: boolean;
  isListening: boolean;
  isAikaSpeaking: boolean;
  conversation: { speaker: 'user' | 'aika'; text: string }[];
  toggleLiveTalk: () => void;
  setUserSpeaking: (status: boolean) => void;
  setAikaSpeaking: (status: boolean) => void;
  addMessage: (message: { speaker: 'user' | 'aika'; text: string }) => void;
};

export const useLiveTalkStore = create<LiveTalkState>((set) => ({
  isLiveTalkActive: false,
  isListening: false,
  isAikaSpeaking: false,
  conversation: [],
  toggleLiveTalk: () => set((state) => ({ isLiveTalkActive: !state.isLiveTalkActive })),
  setUserSpeaking: (status) => set({ isListening: status }),
  setAikaSpeaking: (status) => set({ isAikaSpeaking: status }),
  addMessage: (message) => set((state) => ({ conversation: [...state.conversation, message] })),
}));
