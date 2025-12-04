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
  resource_type?: 'link' | 'activity' | 'video' | 'article';  // Type of resource
  activity_id?: string;  // For interactive activities (e.g., "box-breathing")
}

export interface InterventionPlan {
  plan_steps: PlanStep[];
  resource_cards: ResourceCard[];
  next_check_in?: string; // ISO datetime string
  intervention_reason?: string;
}

export interface Appointment {
  id: number;
  student_id: number;
  psychologist_id: number;
  appointment_datetime: string; // ISO datetime string
  appointment_type_id: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  cancellation_reason?: string;
  psychologist?: {
    id: number;
    full_name: string;
    specialization?: string[];
    languages?: string[];
  };
  appointment_type?: {
    id: number;
    name: string;
    description?: string;
  };
  location?: string;
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
  metadata?: Record<string, any>; // To store things like module_id for event messages
  timestamp: Date;
  interventionPlan?: InterventionPlan; // TCA-generated support plan
  appointment?: Appointment; // Scheduling confirmation
  isError?: boolean; // For error messages
  isStreaming?: boolean; // For streaming messages
  agentActivity?: {
    // Agent Activity Log for transparency
    execution_path: string[]; // ["aika_decision", "sta_subgraph", "tca_subgraph", "synthesize_response"]
    agents_invoked: string[]; // ["STA", "TCA"]
    intent: string; // "emotional_support", "crisis_detection", etc.
    intent_confidence: number; // 0.0 - 1.0
    needs_agents: boolean;
    agent_reasoning: string; // Why Aika made this decision
    response_source: string; // "aika_direct", "agent_synthesis"
    processing_time_ms: number;
    risk_level?: string; // If STA was invoked
    risk_score?: number; // If STA was invoked
  };
  aikaMetadata?: {
    // Aika Meta-Agent metadata
    session_id: string;
    user_role: string;
    intent: string;
    agents_invoked: string[];
    actions_taken: string[];
    processing_time_ms: number;
    risk_assessment?: {
      risk_level: string;
      risk_score: number;
      confidence: number;
      risk_factors: string[];
    };
    escalation_triggered: boolean;
    case_id?: string;
  };
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
  intervention_plan?: InterventionPlan; // NEW: Intervention plan from TCA
  appointment?: Appointment; // NEW: Appointment booking from scheduling tools
  metadata?: {
    // Agent Activity metadata from unified orchestrator
    execution_path?: string[];
    agents_invoked?: string[];
    intent?: string;
    intent_confidence?: number;
    needs_agents?: boolean;
    agent_reasoning?: string;
    response_source?: string;
    processing_time_ms?: number;
    risk_level?: string;
    risk_score?: number;
  };
}