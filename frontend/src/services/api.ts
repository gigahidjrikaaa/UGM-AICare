// src/services/api.ts
// Update the return type to include the possibility of an array response
type ChatResponse = {
  response: string | string[];
  error?: string;
};

export const sendMessage = async (userId: string, message: string): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get response from AI');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};