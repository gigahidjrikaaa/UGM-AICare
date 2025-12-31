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
import { InterventionPlan } from './InterventionPlan';
import { AppointmentCard } from './AppointmentCard';
import { AgentActivityLog } from './AgentActivityLog';
import { AikaThinkingCompact } from './AikaThinkingIndicator';

interface MessageBubbleProps {
  message: Message;
  onCancelAppointment?: (appointmentId: number, reason: string) => Promise<void>;
  onRescheduleAppointment?: (appointmentId: number, newDateTime: string) => Promise<void>;
}

export function MessageBubble({ message, onCancelAppointment, onRescheduleAppointment }: MessageBubbleProps) {
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
  const isError = message.isError;

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
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  };

  const renderAvatar = () => {
    if (isUser) {
      return (
        <div className="shrink-0 w-7 h-7 rounded-full bg-ugm-gold flex items-center justify-center text-ugm-blue-dark font-semibold text-[10px] shadow-sm">
          Me
        </div>
      );
    }
    return (
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden shadow-sm border border-white/20">
        <Image src="/aika-human.jpeg" alt="Aika" width={28} height={28} className="object-cover w-full h-full" />
      </div>
    );
  };

  const renderBubbleContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex flex-col gap-2">
          {message.toolIndicator ? (
            <AikaThinkingCompact message={message.toolIndicator} />
          ) : (
            <div className="flex items-center justify-start h-full px-3 py-2 text-ugm-blue-dark">
              <LoadingDots text="Aika sedang mengetik..." />
            </div>
          )}
        </div>
      );
    }
    return (
      <div className={cn(
        'prose prose-sm max-w-none prose-p:m-0 prose-li:m-0 prose-ul:m-0 prose-ol:m-0',
        isUser ? 'prose-invert' : isError ? 'text-red-200' : 'text-white/90',
        'prose-a:font-medium prose-a:transition-colors',
        isUser ? 'prose-a:text-ugm-gold hover:prose-a:text-ugm-gold/80' : 'prose-a:text-ugm-gold hover:prose-a:text-ugm-gold/80'
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
      className={cn('flex items-start gap-2 my-1.5', isUser ? 'justify-end' : 'justify-start')}
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
    >
      {!isUser && renderAvatar()}
      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-3 py-2 rounded-2xl max-w-xs md:max-w-md lg:max-w-lg text-sm relative',
          isUser
            ? 'bg-ugm-blue text-white rounded-br-sm'
            : isError 
              ? 'bg-red-500/20 backdrop-blur-sm text-red-200 rounded-bl-sm border border-red-500/30'
              : 'bg-white/10 backdrop-blur-sm text-white/90 rounded-bl-sm border border-white/10',
          message.isLoading && 'p-0 bg-white/10 backdrop-blur-sm w-[140px]'
        )}>
          {renderBubbleContent()}
        </div>
        
        {/* Intervention Plan Display */}
        {!isUser && message.interventionPlan && !message.isLoading && (
          <div className="max-w-xs md:max-w-md lg:max-w-lg mt-2">
            <InterventionPlan plan={message.interventionPlan} />
          </div>
        )}
        
        {/* Appointment Card Display */}
        {!isUser && message.appointment && !message.isLoading && (
          <div className="max-w-xs md:max-w-md lg:max-w-lg mt-2">
            <AppointmentCard 
              appointment={message.appointment}
              onCancel={onCancelAppointment}
              onReschedule={onRescheduleAppointment}
            />
          </div>
        )}
        
        {/* Agent Activity Log Display */}
        {!isUser && message.agentActivity && !message.isLoading && (
          <div className="max-w-xs md:max-w-md lg:max-w-lg mt-2">
            <AgentActivityLog agentActivity={message.agentActivity} />
          </div>
        )}
        
        {!message.isLoading && (
          <div className={cn(
            'mt-0.5 text-[10px]',
            isUser ? 'text-white/40 mr-1' : 'text-white/40 ml-1'
          )}>
            {format(message.timestamp, 'HH:mm', { locale: id })}
          </div>
        )}
      </div>
      {isUser && renderAvatar()}
    </motion.div>
  );
}
