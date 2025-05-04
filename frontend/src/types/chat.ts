// src/types/chat.ts
export interface Message {
  id: string; // Unique ID for each message (frontend generated)
  content: string;
  role: 'user' | 'assistant' | 'system'; // System role for initial prompts or summaries
  timestamp: Date;
  isLoading?: boolean; // Optional flag for pending assistant messages
}

// Define possible chat modes
export type ChatMode = 'standard' | 'module_selection' | `module:${string}`; // e.g., 'module:thought_record'

export interface ChatModule {
  id: string;
  name: string;
  description: string;
}