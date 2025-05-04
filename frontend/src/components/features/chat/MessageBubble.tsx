// src/components/features/chat/MessageBubble.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { id } from 'date-fns/locale'; // Import Indonesian locale
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // Import Next.js Image

// Simple loading dots animation
const LoadingDots = () => (
  <div className="flex space-x-1 items-center">
    <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-2 w-2 bg-current rounded-full animate-bounce"></span>
  </div>
);


interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="my-2 text-center text-xs text-gray-300/80 italic px-4">
        {message.content}
      </div>
    );
  }

  return (
    <>
    {/* Message Bubble Container */}
     {/* Flex container to align the message bubble and avatar */}
     {/* Conditional classes for user vs assistant alignment */}
    <div
      className={cn(
        'flex items-start space-x-3 my-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-blue flex items-center justify-center overflow-hidden border border-white/20">
           <Image src="/UGM_Lambang.png" alt="Aika" width={20} height={20} /> {/* Adjusted path/size */}
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg shadow-md text-sm', // Adjusted text size
          isUser
            ? 'bg-ugm-blue text-white rounded-br-none' // Keep user distinct
            : 'bg-white/80 backdrop-blur-sm text-ugm-blue-dark rounded-bl-none', // Lighter assistant bubble for contrast
          message.isLoading && 'flex items-center justify-center min-h-[40px] bg-white/60' // Loading state style
        )}
      >
        {message.isLoading ? (
          <LoadingDots />
        ) : (
          // Apply markdown styling using Tailwind prose or custom styles
           <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 text-inherit"> {/* Basic prose styling */}
             <ReactMarkdown
                components={{
                    // Customize link rendering if needed
                    // a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-ugm-gold hover:underline" />
                }}
            >
              {message.content}
             </ReactMarkdown>
           </div>
        )}
      </div>

        {/* User Avatar (Optional) */}
        {isUser && (
         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-gold flex items-center justify-center text-ugm-blue font-semibold">
            {/* Use user initial or a generic icon */}
             Me
         </div>
        )}

    </div>
    {/* Timestamp display below the bubble */}
    <div className={cn('text-xs text-gray-400 mt-1', isUser ? 'text-right' : 'text-left')}>
      {format(message.timestamp, 'HH:mm', { locale: id })}
    </div>
    </>
  );
}