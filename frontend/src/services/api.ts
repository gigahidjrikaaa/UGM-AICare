// src/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatResponse {
  response: string;
  error?: string;
}

export const sendMessage = async (userId: string, message: string): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        response: '', 
        error: errorData.error || 'Failed to get response from Aika' 
      };
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    return {
      response: '',
      error: 'Network error. Please check your connection and try again.',
    };
  }
};