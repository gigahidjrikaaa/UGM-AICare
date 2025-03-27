"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react'; // Added useCallback
import { motion } from 'framer-motion';
import MessageBubble from './MessageBubble'; // Ensure this component now expects { role, content }
import axios from 'axios';
import { FiSend } from 'react-icons/fi';
import { BiMicrophone } from 'react-icons/bi';

// --- Type Definitions ---

// Simplified Message type aligning with backend history format
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | number | Date; // Add timestamp to match MessageBubble's requirements
}

// Type for the provider selection
type LLMProviderOption = 'togetherai' | 'gemini';

// Type for the backend request payload
interface ChatRequestPayload {
  history: Array<{ role: string; content: string }>;
  provider: LLMProviderOption;
  // Optional params can be added if needed (model, max_tokens, etc.)
  // model?: string;
}

// Type for the backend response payload
interface ChatResponsePayload {
  response: string; // The single response text
  provider_used: string;
  model_used: string;
  history: Message[]; // The full updated history
}

interface ChatInterfaceProps {
  userId?: string; // Keep prop if needed elsewhere, but not used in API call now
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ChatInterface({ userId: _userId = "guest-user" }: ChatInterfaceProps) {
  // Use the simplified Message type for state
  const [messages, setMessages] = useState<Message[]>([]);
  // State for provider selection - use backend expected values
  const [selectedProvider, setSelectedProvider] = useState<LLMProviderOption>('togetherai');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state for display

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<null | HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  //! Enable if using welcome message from Aika. Further UX is needed
  // Add welcome message on mount
  // useEffect(() => {
  //    setMessages([{ role: 'assistant', content: "Hello! I'm Aika. How can I help you today?", timestamp: new Date() }]);
  // }, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Modified handleSubmit Function ---
  const handleSubmit = useCallback(async (e?: React.FormEvent) => { // Make event optional for direct calls
    if (e) e.preventDefault(); // Prevent default form submission if event exists
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // 1. Create the user message in the new format
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      timestamp: new Date()
    };

    // 2. Create the history to be sent, including the new user message
    const currentHistory = [...messages, userMessage];

    // 3. Update UI immediately with the user's message for responsiveness
    setMessages(currentHistory);
    setInput(''); // Clear input field
    setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      // 4. Construct the correct backend URL (using NEXT_PUBLIC_ prefix for client-side env vars)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const backendUrl = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;

      // 5. Create the payload matching the new backend API
      const payload: ChatRequestPayload = {
        history: currentHistory, // Send the full history ending with user message
        provider: selectedProvider // Send selected provider
        // user_id and conversation_id are no longer sent
      };

      // 6. Make the API Call
      const response = await axios.post<ChatResponsePayload>(
        `${backendUrl}/chat`, // Endpoint is now /api/v1/chat
        payload,
        {
          headers: { 'Content-Type': 'application/json' }
          // Add Authorization header here if needed:
          // headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      // 7. Update the messages state with the *full history* returned by the backend
      // Add timestamps to the history if they don't exist
      const historyWithTimestamps = response.data.history.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || new Date() // Use existing timestamp or create new one
      }));
      setMessages(historyWithTimestamps);
      setMessages(response.data.history);

    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessageText = "I'm sorry, an error occurred while connecting to the service.";

      // Extract backend error message if available (FastAPI HTTPException detail)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMessageText = `Error: ${error.response.data.detail}`;
      } else if (error instanceof Error) {
        errorMessageText = `Error: ${error.message}`;
      }
      // Optionally add an error message bubble to the chat
      const errorMessage: Message = {
        role: 'assistant',
        content: errorMessageText,
        timestamp: new Date()
      };
      // Add to messages AFTER the user's message that triggered the error
      setMessages(prev => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
      // Ensure input is focused after response/error for quick follow-up
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, isLoading, messages, selectedProvider]); // Added dependencies for useCallback


  // --- Input Handling ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setInput(e.target.value);
     // Auto expand textarea logic (from your original code)
     e.currentTarget.style.height = "auto";
     e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSubmit(); // Call handleSubmit directly
    }
  };

  // --- Provider Selection Handling ---
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvider(e.target.value as LLMProviderOption);
    // Optional: Clear chat or notify user when provider changes
    // setMessages([{ role: 'assistant', content: `Switched provider. How can I help?` }]);
    // inputRef.current?.focus();
  };


// --- UI Rendering (Your Existing JSX) ---
return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Provider Selection Dropdown */}
      <div className="mb-4 p-4">
        <label htmlFor="model-select" className="block text-sm font-medium mb-1">AI Provider</label>
        <select
          id="model-select" // Added id for label association
          value={selectedProvider}
          onChange={handleProviderChange} // Use the new handler
          className="w-full p-2 bg-white/10 rounded border border-white/20 focus:border-white/40 focus:outline-none text-white" // Added text-white
          disabled={isLoading} // Disable while loading
        >
          {/* Ensure values match backend expectations */}
          <option value="togetherai">Llama 3 (Together AI)</option>
          <option value="gemini">Gemini 1.5 Flash (Google)</option>
          {/* You can add more specific model options later if backend supports model override */}
        </select>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent py-4 px-2 md:px-4 relative">
        {/* Welcome/Empty State */}
        {messages.length <= 1 && !isLoading && ( // Show welcome if only initial message exists
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            {/* ... (Your welcome message JSX) ... */}
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <h2 className="text-xl font-bold mb-2">Welcome to Aika</h2>
              <p className="text-gray-300 max-w-md">
                I&apos;m here to listen, support, and help you navigate your emotions and mental health journey.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {["Aku tidak punya teman cerita.", "Aku merasa gelisah.", "Aku berusaha mengatasi traumaku.", "Aku mencoba untuk menjadi lebih produktif."].map((suggestion, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 text-left text-sm text-white" // Added text-white
                  onClick={() => {
                    setInput(suggestion);
                    setTimeout(() => {
                        inputRef.current?.focus();
                        // Trigger auto-resize after setting input
                        if(inputRef.current) {
                            inputRef.current.style.height = "auto";
                            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
                        }
                    }, 100);
                  }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          </div>
        )}

        {/* Render Messages */}
        {messages.length > 0 && (
             <div className="flex flex-col min-h-full">
                 <div className="flex-1">
                   {/* Map over messages - ensure MessageBubble expects {role, content} */}
                   {messages.map((message, index) => (
                     <MessageBubble key={`${message.role}-${index}`} message={message} /> // Use index for key if no stable ID
                   ))}
                 </div>
             </div>
         )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-lg max-w-[80%]">
            {/* ... (Your loading indicator JSX) ... */}
            <div className="flex space-x-1">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                className="w-2 h-2 bg-[#FFCA40] rounded-full"
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="w-2 h-2 bg-[#FFCA40] rounded-full"
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="w-2 h-2 bg-[#FFCA40] rounded-full"
              />
            </div>
            <span className="text-sm text-gray-300">Aika is thinking...</span>
          </div>
        )}

        {/* Error Display */}
        {error && !isLoading && (
            <div className="px-4 py-2">
                 <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm">
                     {error}
                 </div>
             </div>
         )}

        {/* Invisible element for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-3 border-t border-white/10 bg-[#001D58]/80 backdrop-blur-sm" // Added backdrop-blur-sm
      >
        {/* Use form element for better accessibility and Enter key handling */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 focus-within:bg-white/15 transition">
             <textarea
               ref={inputRef}
               value={input}
               onChange={handleInputChange} // Use the combined handler
               onKeyDown={handleKeyDown} // Use the specific handler for Enter
               placeholder="Type a message..."
               className="w-full bg-transparent focus:outline-none resize-none text-white scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent" // Added scrollbar styling
               rows={1}
               style={{ minHeight: "24px", maxHeight: "120px" }} // Ensure these are set
               disabled={isLoading}
             />
            </div>

          {/* Voice Input Button (from your original code) */}
          <button
            type="button"
            className="p-3 text-white rounded-full hover:bg-white/10 transition disabled:opacity-50"
            title="Voice input (coming soon)"
            disabled={isLoading} // Disable during loading
          >
            <BiMicrophone size={20} />
          </button>

          {/* Send Button */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!input.trim() || isLoading}
            className="bg-[#FFCA40] text-[#001D58] p-3 rounded-full disabled:opacity-50 transition" // Added transition
          >
            <FiSend size={20} />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}