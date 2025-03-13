"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import MessageBubble from './MessageBubble';
import axios from 'axios';
import { FiSend } from 'react-icons/fi';
import { BiMicrophone } from 'react-icons/bi';

interface ChatInterfaceProps {
  userId?: string; // Make it optional for backward compatibility
}

// Message type definition
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export default function ChatInterface({ userId = "guest-user" }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<null | HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
  
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
  
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const payload = { 
        user_id: userId, // Now using the passed userId
        message: input 
      };

      const conversationId = localStorage.getItem('conversation_id');
      if (conversationId) {
        payload['conversation_id'] = conversationId;
      }

      // API Call
      const response = await axios.post(
        `${backendUrl}/chat/`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Axios automatically throws errors for non-200 responses
      // and parses JSON responses, so no need for response.json()
      const data = response.data;
      
      // Store conversation ID if returned by backend
      if (data.conversation_id) {
        localStorage.setItem('conversation_id', data.conversation_id);
      }
      
      // Add AI response
      const aiMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: data.response || data.message || "I couldn't generate a proper response.",
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // More detailed error logging with axios
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "I'm sorry, I couldn't connect to the backend service. Please check your connection or try again later.",
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Only replacing the return part - rest of component stays the same

return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Messages container with fixed height and scrolling */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent py-4 px-2 md:px-4 relative">
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
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
              {["How are you feeling today?", "I'm feeling anxious", "Can you help me relax?", "Tell me about yourself"].map((suggestion, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 text-left text-sm"
                  onClick={() => {
                    setInput(suggestion);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col min-h-full">
            <div className="flex-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-lg max-w-[80%]">
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
        
        {/* Invisible element for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input - fixed at bottom */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="p-3 border-t border-white/10 bg-[#001D58]/80 backdrop-blur-sm"
      >
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 focus-within:bg-white/15 transition">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-transparent focus:outline-none resize-none max-h-32 text-white"
              rows={1}
              style={{
                height: "auto",
                minHeight: "24px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                // Auto expand textarea
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
            />
          </div>
          
          <button
            type="button"
            className="p-3 text-white rounded-full hover:bg-white/10 transition"
            title="Voice input (coming soon)"
          >
            <BiMicrophone size={20} />
          </button>
          
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!input.trim() || isLoading}
            className="bg-[#FFCA40] text-[#001D58] p-3 rounded-full disabled:opacity-50"
          >
            <FiSend size={20} />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}