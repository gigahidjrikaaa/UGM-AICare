import { Message } from './ChatInterface';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const preprocessMarkdown = (content: string) => {
    // Ensure bullet points have proper line breaks before them
    let processed = content.replace(/([^\n])\n\* /g, '$1\n\n* ');
    
    // Ensure blank line before numbered lists
    processed = processed.replace(/([^\n])\n(\d+)\. /g, '$1\n\n$2. ');
    
    return processed;
  };
  
  // Use a consistent time format that doesn't rely on locale-specific formatting
  const formattedTime = useMemo(() => {
    const date = new Date(message.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [message.timestamp]);

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-[#001D58] text-white rounded-tr-none' 
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
        }`}
      >
        <div className="markdown-content">
          <ReactMarkdown
            components={{
              ul: ({...props}) => 
                <ul className="list-disc pl-5 my-2" {...props} />,
              ol: ({...props}) => 
                <ol className="list-decimal pl-5 my-2" {...props} />,
              li: ({...props}) => 
                <li className="mb-1" {...props} />,
              p: ({...props}) => 
                <p className="mb-2 last:mb-0" {...props} />,
              h1: ({...props}) => 
                <h1 className="text-xl font-bold my-3" {...props} />,
              h2: ({...props}) => 
                <h2 className="text-lg font-bold my-2" {...props} />,
              h3: ({...props}) => 
                <h3 className="text-md font-bold my-2" {...props} />,
              a: ({...props}) => 
                <a className={`underline ${isUser ? 'text-blue-200' : 'text-blue-600'}`} {...props} />,
            }}
          >
            {preprocessMarkdown(message.content)}
          </ReactMarkdown>
        </div>
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