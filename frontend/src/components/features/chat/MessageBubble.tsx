// src/components/features/chat/MessageBubble.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { motion, Variants } from 'framer-motion';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { useEffect } from 'react';
import { useLiveTalkStore } from '@/store/useLiveTalkStore';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const messageSoundsEnabled = useLiveTalkStore((state) => state.messageSoundsEnabled);

  useEffect(() => {
    if (!message.isLoading && messageSoundsEnabled) {
      const audio = new Audio(
        message.role === 'user'
          ? '/sounds/message_bubble_user.mp3'
          : '/sounds/message_bubble_aika.mp3'
      );
      audio.play().catch(error => {
        if (error.name === 'NotAllowedError') {
          console.warn("Audio auto-play blocked by browser. User interaction required.");
        } else {
          console.error("Audio play failed:", error);
        }
      });
    }
  }, [message.isLoading, message.role, messageSoundsEnabled]);

  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
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

  const bubbleVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  const renderAvatar = () => {
    if (isUser) {
      return (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-gold flex items-center justify-center text-ugm-blue-dark font-semibold text-xs border-2 border-white/30 shadow-sm self-start mt-1">
          Me
        </div>
      );
    }
    return (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ugm-blue flex items-center justify-center overflow-hidden border-2 border-white/30 shadow-sm self-start mt-1">
        <Image src="/aika-human.jpeg" alt="Aika" width={32} height={32} className="object-cover w-full h-full" />
      </div>
    );
  };

  const renderBubbleContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex items-center justify-start h-full px-3.5 py-2.5 text-ugm-blue-dark">
          <LoadingDots text="Aika sedang mengetik..." />
        </div>
      );
    }
    return (
      <div className={cn(
        'prose prose-sm max-w-none prose-p:m-0 prose-li:m-0 prose-ul:m-0 prose-ol:m-0',
        isUser ? 'prose-invert' : 'text-ugm-blue-dark',
        'prose-a:font-medium prose-a:transition-colors',
        isUser ? 'prose-a:text-ugm-gold hover:prose-a:text-ugm-gold/80' : 'prose-a:text-ugm-blue-dark hover:prose-a:text-ugm-blue/80 prose-a:underline'
      )}>
        <ReactMarkdown
          components={{
            a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <motion.div
      className={cn('flex items-end gap-2 my-2', isUser ? 'justify-end' : 'justify-start')}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
    >
      {!isUser && renderAvatar()}
      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-3.5 py-2.5 rounded-xl max-w-xs md:max-w-md lg:max-w-lg shadow-md text-sm relative',
          'min-h-[44px]',
          isUser
            ? 'bg-ugm-blue text-white rounded-br-none'
            : 'bg-white/90 backdrop-blur-sm text-ugm-blue-dark rounded-bl-none border border-gray-200/50',
          message.isLoading && 'p-0 bg-white/70 backdrop-blur-sm w-[150px]'
        )}>
          {renderBubbleContent()}
        </div>
        {!message.isLoading && (
          <div className={cn(
            'mt-1 text-[10px]',
            isUser ? 'text-gray-400/90 mr-1' : 'text-gray-500/90 ml-1'
          )}>
            {format(message.timestamp, 'HH:mm', { locale: id })}
          </div>
        )}
      </div>
      {isUser && renderAvatar()}
    </motion.div>
  );
}
