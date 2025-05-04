// src/components/features/chat/MessageBubble.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { motion } from 'framer-motion'; // Import motion

// Simple loading dots animation (no changes needed)
const LoadingDots = () => (
  <div className="flex space-x-1.5 items-center justify-center h-full"> {/* Added justify-center */}
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
  </div>
);

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    // Keep system messages subtle and centered
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="my-3 text-center text-xs text-gray-300/80 italic px-4"
      >
        {message.content}
      </motion.div>
    );
  }

  // Framer Motion variants for bubble animation
  const bubbleVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    // Use motion.div for the entire message row animation
    <motion.div
      className={cn('flex items-end space-x-2 my-3', isUser ? 'justify-end' : 'justify-start')}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-blue flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-sm">
          {/* Ensure path is correct in /public */}
          <Image src="/UGM_Lambang.png" alt="Aika" width={20} height={20} />
        </div>
      )}

      {/* Bubble Content Area */}
      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'p-3 rounded-xl max-w-xs md:max-w-md lg:max-w-lg shadow-md text-sm relative', // Softer corners (rounded-xl)
            // Bubble styles based on role
            isUser
              ? 'bg-ugm-blue text-white rounded-br-none' // User bubble style remains distinct
              : 'bg-white/80 backdrop-blur-sm text-ugm-blue-dark rounded-bl-none border border-white/10', // Assistant glass style with border
            // Loading state styles
            message.isLoading && 'h-[48px] w-[60px] p-0 flex items-center justify-center',
             // Add prose styles here when not loading
            !message.isLoading && [
                'prose prose-sm max-w-none prose-p:my-1.5 prose-li:my-0.5', // Base prose styles
                isUser ? 'prose-invert' : 'text-ugm-blue-dark', // Text color
                'prose-a:font-medium prose-a:transition-colors', // Base link styles
                isUser ? 'prose-a:text-ugm-gold hover:prose-a:text-ugm-gold/80' : 'prose-a:text-ugm-blue-dark hover:prose-a:text-ugm-blue/80 prose-a:underline' // Link color per role
            ]
          )}
        >
          {message.isLoading ? (
            <LoadingDots />
          ) : (
            <ReactMarkdown
              components={{
                  // Customize link rendering
                  a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {/* Timestamp (Optional, subtle) */}
        {!message.isLoading && (
           <div className={cn(
               'mt-1 text-[10px]', // Smaller text size
               isUser ? 'text-gray-400/80 mr-1' : 'text-gray-500/80 ml-1' // Adjusted positioning/color
               )}>
             {format(message.timestamp, 'HH:mm', { locale: id })}
           </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-gold flex items-center justify-center text-ugm-blue-dark font-semibold text-xs border-2 border-white/30 shadow-sm">
          Me
        </div>
      )}
    </motion.div>
  );
}