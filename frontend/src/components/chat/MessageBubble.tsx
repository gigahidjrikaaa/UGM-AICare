import { Message } from './ChatInterface';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-[#001D58] text-white rounded-tr-none' 
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
        }`}
      >
        {message.content}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-300 text-right' : 'text-gray-500'
          }`}
        >
          {formattedTime}
        </div>
      </div>
    </div>
  );
}