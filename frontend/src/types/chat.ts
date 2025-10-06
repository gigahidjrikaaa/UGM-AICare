// src/types/chat.ts
export interface PlanStep {
  id: string;
  label: string;
  duration_min?: number;
}

export interface ResourceCard {
  resource_id: string;
  title: string;
  summary: string;
  url?: string;
}

export interface InterventionPlan {
  plan_steps: PlanStep[];
  resource_cards: ResourceCard[];
  next_check_in?: string; // ISO datetime string
  intervention_reason?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id?: string; // Optional if AI message
  session_id: string; // Added if not present, useful for tracking
  content: string;
  role: 'user' | 'assistant' | 'system' | 'event'; // 'event' for module triggers
  created_at: string;
  updated_at: string;
  isLoading?: boolean; // For UI state, not part of backend model
  toolIndicator?: string; // For showing tool usage info
  feedback_id?: string;
  annotations?: unknown[]; // Or a more specific type if annotations have a defined structure
  run_id?: string;
  metadata?: Record<string, unknown>; // To store things like module_id for event messages
  timestamp: Date;
  interventionPlan?: InterventionPlan; // SCA-generated support plan
}

export type ChatMode = 'standard' | 'summarize' | 'rag' | `module:${string}`; // Example

export interface AvailableModule {
  id: string; // Corresponds to the module_id in the backend
  name: string; // Display name for the module
  description: string; // Short description for the UI
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; // Optional: if you plan to add icons
}

export type ChatModule = AvailableModule;

export interface ApiMessage {
  role: 'user' | 'assistant' | 'system'; // 'system' might be filtered out before sending to backend for history
  content: string;
  timestamp?: string;
}

export interface ChatEventPayload {
  type: 'start_module' | 'end_module' | string; // 'end_module' might not be used if backend doesn't signal it
  module_id?: string;
  // data?: Record<string, any>; // For any other event-specific data
}

export interface ChatRequestPayload {
    google_sub: string;
    session_id: string;
    conversation_id: string; // <<< ADDED THIS FIELD based on error analysis
    provider?: 'togetherai' | 'gemini';
    model?: string;
    max_tokens?: number;
    temperature?: number;
    system_prompt?: string;
    // Conditionally include message/history OR event
    message?: string; // User's message content (string)
    history?: ApiMessage[];
    event?: ChatEventPayload;
  }

export interface ChatResponsePayload {
    response: string; // The AI's response content (string)
    provider_used: string;
    model_used: string;
    history: ApiMessage[]; // Expect the updated history back from backend
    // NO session_id or conversation_id at the root of the response based on your file.
    // These will need to be taken from the client-side context when creating assistant messages.
    module_state?: { module: string; step: number }; // Example if backend sends state
    suggestions?: ChatModule[]; // Example if backend sends suggestions
    module_completed_id?: string;
  }