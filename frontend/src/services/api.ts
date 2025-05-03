// frontend/src/services/api.ts

import axios from 'axios';

// Define the base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/api/v1" || 'http://localhost:8000/api/v1'; // Adjust if needed

// Define interfaces for type safety

export interface Message {
  timestamp: string; // Assuming ISO string format from backend
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Matches backend ChatRequest model
export interface ChatRequestPayload {
  history: Message[];
  provider?: 'togetherai' | 'gemini'; // Optional, backend might have a default
  model?: string; // Optional
  max_tokens?: number; // Optional
  temperature?: number; // Optional, use 'number' instead of GLfloat
  system_prompt?: string; // Optional
  // Add other parameters if defined in backend ChatRequest
}

// Matches backend ChatResponse model
export interface ChatResponsePayload {
  response: string;
  provider_used: string;
  model_used: string;
  history: Message[]; // Expect the updated history back
}


const apiClient = axios.create({
  baseURL: API_BASE_URL || 'http://127.0.0.1:8000/api/v1', // Point to backend base
  headers: {
    'Content-Type': 'application/json',
  },
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
    console.log("Sending to backend:", payload); // Log what's being sent
    const response = await apiClient.post<ChatResponsePayload>('/api/v1/chat', payload);
    console.log("Received from backend:", response.data); // Log what's received
    return response.data;
  } catch (error) {
    console.error('Error sending message to backend:', error);
    // Provide more specific error feedback if possible
    let errorMessage = 'Failed to get response from AICare assistant.';
    if (axios.isAxiosError(error) && error.response) {
      // Use the detail message from FastAPI's HTTPException if available
      errorMessage = error.response.data?.detail || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Re-throw a more structured error or return a specific error object
    // For simplicity here, we'll throw a new error with the message
    throw new Error(errorMessage);
  }
};

// You can add other API service functions here (e.g., for login, profile, etc.)