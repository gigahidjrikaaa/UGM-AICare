// src/app/aika/page.tsx
'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/features/chat/ChatInterface';
import ParticleBackground from '@/components/ui/ParticleBackground'; // Assuming this exists
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ModelSelector from '@/components/features/chat/ModelSelector';

// Loading Component (Keep as before)
const LoadingIndicator = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
    <div className="text-center">
      <div className="inline-block w-16 h-16 relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FFCA40]"></div>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <Image src="/UGM_Lambang.png" alt="UGM" width={32} height={32} />
        </div>
      </div>
      <p className="mt-4 text-lg">Loading Aika...</p>
    </div>
  </div>
);

const modelOptions = [
  { value: 'gemma_local', label: 'Gemma (INA17)' },
  { value: 'gemini_google', label: 'Gemini (Google)' },
];

export default function AikaChatPage() {
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const [model, setModel] = useState('gemini_google');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [mounted, status, router]);

  if (!mounted || status === 'loading') {
    return <LoadingIndicator />;
  }

  if (status === 'unauthenticated') {
     return <LoadingIndicator />; // Keep showing loader until redirect happens
  }

  // --- Main Render (Authenticated) ---
  return (
    <>
      <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] text-white"> {/* Solid gradient */}
        {/* Particle Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
        </div>

        {/* Content area - Centered */}
        <motion.div
          className="relative z-10 h-screen flex flex-col items-center justify-center p-2 md:p-4 lg:p-6" // Center content vertically/horizontally
        >
          {/* Model Selector Dropdown */}
          <div className="w-full max-w-5xl mb-4 flex justify-end">
            <ModelSelector model={model} setModel={setModel} options={modelOptions} />
          </div>

          {/* Main chat container with Glassmorphism */}
          <div className="w-full max-w-5xl h-[85vh] flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
             {/* Chat Interface takes remaining space */}
             <div className="flex-1 overflow-hidden"> {/* Important for ChatWindow's scrolling */}
                <ChatInterface />
             </div>
          </div>

          {/* Footer credit - Moved outside main container for centering */}
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-3 text-center text-xs text-gray-300/70"
            >
              <p>Disclaimer: Aika adalah AI dan bukan pengganti profesional medis.</p>
              <p className="mt-1">Built with ❤️ by UGM AICare Team</p>
          </motion.div>

        </motion.div> {/* End centered content area */}
      </main>
    </>
  );
}
