// src/app/page.tsx
import ChatInterface from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800">UGM-AICare</h1>
          <p className="text-lg text-gray-600 mt-2">
            Your supportive mental health AI assistant
          </p>
        </div>
        
        <ChatInterface />
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Built with ❤️ by UGM-AICare Team</p>
        </div>
      </div>
    </main>
  );
}