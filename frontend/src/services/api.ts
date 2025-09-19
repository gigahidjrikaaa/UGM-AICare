// frontend/src/services/api.ts

import axios from 'axios';
import type {
  ChatRequestPayload,
  ChatResponsePayload,
  JournalPromptResponse,
  JournalEntryItem,
  JournalReflectionPointResponse, // Add this type
  Psychologist,
  AppointmentType,
  AppointmentCreate,
  Appointment
} from '@/types/api'; // Import types
import toast from 'react-hot-toast';
import { getSession, signOut } from 'next-auth/react';

// Define the base URL for your backend API
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api/v1' // Local development
    : process.env.INTERNAL_API_URL + '/api/v1'; // Docker or production


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', },
});

// Add request interceptor to attach JWT token to every request
// This will be called before every request to the backend
apiClient.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    const token = session?.accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Optional: Add response interceptor for global error handling (e.g., 401 redirect)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      console.error("API request Unauthorized (401):", error.response.data?.detail);
      signOut({ callbackUrl: '/signin' });
    }
     // Log other errors
     if (axios.isAxiosError(error)) {
       console.error(`API Error (${error.response?.status}):`, error.response?.data || error.message);
     } else {
       console.error("API Error:", error);
     }
    return Promise.reject(error); // Propagate the error
  }
);

export default apiClient; // Export the configured client if needed elsewhere

/**
 * Sends conversation history to the backend chat endpoint and retrieves the AI response.
 * @param payload - The chat request payload including history and provider choice.
 * @returns A promise that resolves with the chat response payload.
 */
export const sendMessage = async (payload: ChatRequestPayload): Promise<ChatResponsePayload> => {
  try {
    const response = await apiClient.post<ChatResponsePayload>('/chat', payload);
    return response.data;
  } catch (error) {
    console.error('Error sending message to backend:', error);
    let errorMessage = 'Failed to get response from AICare assistant.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

// --- Journal Prompts API ---
export const getActiveJournalPrompts = async (): Promise<JournalPromptResponse[]> => {
  try {
    const response = await apiClient.get<JournalPromptResponse[]>('/journal-prompts/');
    return response.data;
  } catch (error) {
    console.error('Error fetching journal prompts:', error);
    let errorMessage = 'Failed to load journal prompts.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

// --- Journal Entries API (Example for creating/updating if not already in a specific hook/component) ---
// You might already have this logic within JournalEntryModal.tsx, but for completeness:
export interface JournalEntryPayload {
  entry_date: string; // YYYY-MM-DD
  content: string;
  prompt_id?: number | null;
}

export const saveJournalEntry = async (payload: JournalEntryPayload): Promise<JournalEntryItem> => {
  try {
    // The backend endpoint is POST /journal/ for both create and update based on date
    const response = await apiClient.post<JournalEntryItem>('/journal/', payload);
    return response.data;
  } catch (error) {
    console.error('Error saving journal entry:', error);
    let errorMessage = 'Failed to save journal entry.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

// --- Journal Reflection Points API ---
export const getMyJournalReflections = async (limit: number = 5): Promise<JournalReflectionPointResponse[]> => {
  try {
    const response = await apiClient.get<JournalReflectionPointResponse[]>(`/journal-prompts/reflections/me`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching journal reflections:', error);
    let errorMessage = 'Failed to load personalized reflections.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Don't throw an error that stops the modal, just log and return empty or show a subtle message in UI
    // throw new Error(errorMessage); 
    console.warn(errorMessage); // Log the error for debugging
    toast.error(errorMessage); // Show a toast notification for user feedback
    return []; // Return empty array on error so UI doesn't break
  }
};

// --- Psychologist Appointments API ---
export const getPsychologists = async (): Promise<Psychologist[]> => {
  try {
    const response = await apiClient.get<Psychologist[]>('/psychologists');
    return response.data;
  } catch (error) {
    console.error('Error fetching psychologists:', error);
    let errorMessage = 'Failed to load psychologists.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

export const getAppointmentTypes = async (): Promise<AppointmentType[]> => {
  try {
    const response = await apiClient.get<AppointmentType[]>('/appointment-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching appointment types:', error);
    let errorMessage = 'Failed to load appointment types.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

export const createAppointment = async (payload: AppointmentCreate): Promise<Appointment> => {
  try {
    const response = await apiClient.post<Appointment>('/appointments', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    let errorMessage = 'Failed to create appointment.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

// --- User Registration ---
export interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  university?: string;
  major?: string;
  yearOfStudy?: string;
  allowEmailCheckins?: boolean;
}

export interface RegisterUserResponse {
  message: string;
  user_id: number;
}

export const registerUser = async (payload: RegisterUserPayload): Promise<RegisterUserResponse> => {
  try {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error);
    let errorMessage = 'Failed to register user.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

// --- User Login ---
export interface LoginUserPayload {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginUserResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export const loginUser = async (payload: LoginUserPayload): Promise<LoginUserResponse> => {
  try {
    const response = await apiClient.post('/auth/token', payload);
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error);
    let errorMessage = 'Failed to log in.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};








