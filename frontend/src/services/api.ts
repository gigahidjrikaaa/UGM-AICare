// frontend/src/services/api.ts

import axios from 'axios';

// Define the base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000//api/v1/chat'; // Adjust if needed

// Define interfaces for type safety

export interface Message {
  timestamp: Date;
  role: 'user' | 'assistant' | 'system'; // Allow system role if used
  content: string;
}

// Matches backend ChatRequest model
export interface ChatRequestPayload {
  history: Message[];
  provider?: 'togetherai' | 'gemini'; // Make provider optional if backend has default
  model?: string;
  max_tokens?: number;
  temperature?: GLfloat;
  system_prompt?: string;
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
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Add Authorization header if your backend requires authentication
    // 'Authorization': `Bearer ${your_auth_token}`
  },
});

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

export default apiClient; // Export the configured client if needed elsewhere