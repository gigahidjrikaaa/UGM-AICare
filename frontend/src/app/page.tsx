import ChatInterface from '@/components/chat/ChatInterface';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image 
              src="/ugm-logo.png" 
              alt="UGM Logo" 
              width={80} 
              height={80} 
              className="mr-3"
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold text-white">UGM-AICare</h1>
              <p className="text-lg text-[#FFCA40] mt-1">
                Aika: Your Mental Health Companion
              </p>
            </div>
          </div>
          <p className="text-lg text-gray-200 mt-2 max-w-2xl mx-auto">
            Developed by the Faculty of Psychology and Computer Science at Universitas Gadjah Mada
          </p>
        </div>
        
        <div className="bg-white bg-opacity-10 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-white border-opacity-20 mb-8">
          <ChatInterface />
        </div>
        
        <div className="mt-8 text-center text-gray-200 text-sm flex flex-col items-center">
          <div className="flex items-center mb-2">
            <span className="mr-2">Built with ❤️ by</span>
            <Image 
              src="/ugm-text-logo.png" 
              alt="UGM" 
              width={60} 
              height={20} 
              className="opacity-80"
            />
            <span className="ml-2">AICare Team</span>
          </div>
          <p className="text-xs text-gray-300">© 2025 Universitas Gadjah Mada</p>
        </div>
      </div>
    </main>
  );
}