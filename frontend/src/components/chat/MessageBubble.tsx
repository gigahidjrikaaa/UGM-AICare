import { useMemo } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | number | Date;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message?.role === 'user';

  // Get the user session to access profile picture
  const { data: session } = useSession();
  
  const preprocessMarkdown = (content: string) => {
    // Ensure bullet points have proper line breaks before them
    let processed = content.replace(/([^\n])\n\* /g, '$1\n\n* ');
    
    // Ensure blank line before numbered lists
    processed = processed.replace(/([^\n])\n(\d+)\. /g, '$1\n\n$2. ');
    
    return processed;
  };
  
  // Use a consistent time format that doesn't rely on locale-specific formatting
  const formattedTime = useMemo(() => {
    if (!message?.timestamp) return '';
    
    const date = new Date(message.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [message?.timestamp]);
  
  // Add safety check to prevent the error after all hooks are called
  if (!message) {
    return null; // Don't render anything if message is undefined
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className={`flex w-full mb-4 items-end ${isUser ? 'justify-end' : 'justify-start'}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
    >
      {/* Aika Avatar - Only shown for assistant messages */}
      {!isUser && (
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex-shrink-0 mr-2"
      >
        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#FFCA40]/40">
        <Image 
          src="/aika-human.jpeg" 
          alt="Aika" 
          fill
          className="object-cover"
          onError={(e) => {
          // Fallback if image doesn't exist
          const target = e.target as HTMLImageElement;
          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23FFCA40'/%3E%3Ctext x='20' y='25' font-family='Arial' font-size='20' text-anchor='middle' fill='%23001D58'%3EA%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
        </div>
      </motion.div>
      )}
      
      {/* Message Bubble */}
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
      
      {/* User Avatar */}
      {isUser && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-shrink-0 ml-2"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#001D58]/40">
            <Image 
              src={session?.user?.image || "/user-avatar.png"}
              alt={session?.user?.name || "User"}
              fill
              className="object-cover"
              onError={(e) => {
                // Fallback if image doesn't exist or fails to load
                const target = e.target as HTMLImageElement;
                
                // If we have the user's name, use their initials in the fallback
                if (session?.user?.name) {
                  const initials = session.user.name.charAt(0).toUpperCase();
                  target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23001D58'/%3E%3Ctext x='20' y='25' font-family='Arial' font-size='20' text-anchor='middle' fill='white'%3E${initials}%3C/text%3E%3C/svg%3E`;
                } else {
                  // Default fallback with "U"
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23001D58'/%3E%3Ctext x='20' y='25' font-family='Arial' font-size='20' text-anchor='middle' fill='white'%3EU%3C/text%3E%3C/svg%3E";
                }
              }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}