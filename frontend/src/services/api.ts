// frontend/src/services/api.ts

import axios from 'axios';
import type { ChatRequestPayload, ChatResponsePayload, JournalPromptResponse, JournalEntryItem } from '@/types/api'; // Import types

// Define the base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/api/v1" || 'http://localhost:8000/api/v1'; // Adjust if needed

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', },
});

/// Function to get the JWT from our new API route
async function getRawToken(): Promise<string | null> {
  try {
      // Make a request to your own API route
      const response = await fetch('/api/auth/getToken');
      if (!response.ok) {
           console.error("Failed to fetch raw token:", response.statusText);
           return null;
      }
      const data = await response.json();
      return data.jwt || null;
  } catch (error) {
      console.error("Error fetching raw token:", error);
      return null;
  }
}

// Add request interceptor to attach JWT token to every request
// This will be called before every request to the backend
apiClient.interceptors.request.use(
async (config) => {
  const token = await getRawToken(); // Fetch the raw token string

  if (token && config.headers) {
     console.log("Attaching RAW JWT to request:", String(token).substring(0, 15) + "...");
     config.headers.Authorization = `Bearer ${token}`;
     console.log("Authorization header set:", config.headers.Authorization);
     
  } else {
     console.log("No raw token found, request sent without Authorization header.");
  }
  return config;
},
(error) => {
  return Promise.reject(error);
}
);

// Optional: Add response interceptor for global error handling (e.g., 401 redirect)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access, e.g., redirect to login
      console.error("API request Unauthorized (401):", error.response.data?.detail);
      // Optionally: signOut({ callbackUrl: '/signin' });
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
    // No need to explicitly omit google_sub/session_id here as the hook adds them
    console.log("Sending to backend (/chat):", payload); // Log the final payload being sent
    // Ensure the endpoint path is correct (includes /api/v1 prefix if needed by backend routes)
    const response = await apiClient.post<ChatResponsePayload>('/chat', payload); // Endpoint adjusted if needed
    console.log("Received from backend (/chat):", response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending message to backend:', error);
    let errorMessage = 'Failed to get response from AICare assistant.';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.detail || `API Error (${error.response.status}): ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage); // Re-throw cleaned error
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