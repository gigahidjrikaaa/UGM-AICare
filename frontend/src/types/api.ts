// src/types/api.ts
// Re-define or ensure these match your backend schemas.py and api.ts interfaces
export interface ApiMessage {
    // Matches backend's history format if different from frontend's Message
    role: 'user' | 'assistant' | 'system';
    content: string;
    // Backend might have timestamp as string
    timestamp?: string;
  }
  
  // Matches backend ChatRequest model in schemas.py
  export interface ChatEventPayload { // Matches backend ChatEvent schema
    type: 'start_module';
    module_id: string;
  }
  
  export interface ChatRequestPayload {
    google_sub: string; // Added as per backend schema
    session_id: string; // Added as per backend schema
    provider?: 'togetherai' | 'gemini';
    model?: string;
    max_tokens?: number;
    temperature?: number;
    system_prompt?: string;
    // Conditionally include message/history OR event
    message?: string;
    history?: ApiMessage[];
    event?: ChatEventPayload;
  }
  
  // Matches backend ChatResponse model in schemas.py
  export interface ChatResponsePayload {
    response: string;
    provider_used: string;
    model_used: string;
    history: ApiMessage[]; // Expect the updated history back
    // Add other potential fields backend might send based on mode
    module_state?: { module: string; step: number }; // Example if backend sends state
    suggestions?: ChatModule[]; // Example if backend sends suggestions
    module_completed_id?: string;
  }
  
  // Define a basic structure for ChatModule, adjust as needed based on backend
  export interface ChatModule {
    id: string;
    name: string;
    description?: string;
  }

  // --- Journal Prompt Types ---
export interface JournalPromptResponse {
  id: number;
  text: string;
  category?: string | null;
  is_active: boolean;
  created_at: string; 
  updated_at: string;
}

// --- Journal Entry Types ---
// This can be used by DailyJournal.tsx for its allEntries state
export interface JournalEntryItem {
  id: number;
  user_id: number;
  entry_date: string; // yyyy-MM-dd
  content: string;
  created_at: string;
  updated_at: string;
  prompt_id?: number | null;
  prompt?: JournalPromptResponse | null; // Include the prompt object
  reflection_points?: JournalReflectionPointResponse[];
}

export interface JournalReflectionPointResponse {
  id: number;
  journal_entry_id: number;
  user_id: number;
  reflection_text: string;
  // reflection_category?: string | null; // Uncomment if you add this field in the backend schema
  created_at: string; // ISO date string
}