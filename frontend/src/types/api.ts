// src/types/api.ts

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
  mood?: number | null; // 1-5 scale (Deprecated)
  valence?: number | null; // -1.0 to 1.0
  arousal?: number | null; // -1.0 to 1.0
  word_count: number;
  tags?: JournalTagResponse[];
}

export interface JournalTagResponse {
  id: number;
  journal_entry_id: number;
  tag_name: string;
  created_at: string;
}

export interface JournalReflectionPointResponse {
  id: number;
  journal_entry_id: number;
  user_id: number;
  reflection_text: string;
  // reflection_category?: string | null; // Uncomment if you add this field in the backend schema
  created_at: string; // ISO date string
}

export interface JournalEntryCreate {
  entry_date: string;
  content: string;
  prompt_id?: number | null;
  mood?: number | null;
  valence?: number | null;
  arousal?: number | null;
  tags: string[];
}

export interface JournalEntryFilter {
  search_query?: string;
  mood_min?: number;
  mood_max?: number;
  valence_min?: number;
  valence_max?: number;
  arousal_min?: number;
  arousal_max?: number;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}

export interface JournalAnalyticsResponse {
  total_entries: number;
  total_word_count: number;
  avg_word_count: number;
  mood_distribution: { [key: number]: number };
  most_used_tags: Array<{ tag: string; count: number }>;
  mood_trend: Array<{ date: string; mood: number }>;
  writing_frequency: Array<{ date: string; count: number }>;
}

// --- Psychologist Appointment Types ---
export interface Psychologist {
  id: number;
  name: string;
  specialization?: string | null;
  image_url?: string | null;
  is_available: boolean;
}

export interface AppointmentType {
  id: number;
  name: string;
  duration_minutes: number;
  description?: string | null;
}

export interface AppointmentBase {
  psychologist_id: number;
  appointment_type_id: number;
  appointment_datetime: string; // ISO 8601 format string
  notes?: string | null;
  status?: string; // e.g., "scheduled", "completed", "cancelled"
}

export interface AppointmentCreate extends AppointmentBase {
  user_identifier: string; // google_sub
}

export interface Appointment extends AppointmentBase {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  psychologist: Psychologist; // Nested object
  appointment_type: AppointmentType; // Nested object
}
