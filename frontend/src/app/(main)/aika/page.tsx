// src/app/aika/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ChatInterface from '@/components/features/chat/ChatInterface';
import ParticleBackground from '@/components/ui/ParticleBackground'; // Assuming this exists
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Info, Settings, ClipboardList } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AIKA_MEMORY_NOTE } from '@/constants/chat';
import { InterventionPlansSidebar } from '@/components/features/chat/InterventionPlansSidebar';
import { useInterventionPlans } from '@/hooks/useInterventionPlans';
// Model selector now integrated inside ChatInterface footer

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
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  
  // Fetch intervention plans to show count badge
  const { data: plansData } = useInterventionPlans(true);

  // Persist model choice in localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('aika:selectedModel');
      if (saved) setModel(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('aika:selectedModel', model);
    } catch {
      // ignore
    }
  }, [model]);

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
          {/* Unified Chat Container (header simplified, controls moved to footer bar) */}
          <div className="w-full max-w-5xl h-[85vh] flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            <HeaderBar 
              onOpenControlCenter={() => setIsControlCenterOpen(true)} 
              onOpenPlans={() => setIsPlansOpen(true)}
              activePlansCount={plansData?.total || 0}
            />
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                model={model}
                setModel={setModel}
                modelOptions={modelOptions}
                isControlCenterOpen={isControlCenterOpen}
                onCloseControlCenter={() => setIsControlCenterOpen(false)}
              />
            </div>
          </div>
          
          {/* Intervention Plans Sidebar */}
          <InterventionPlansSidebar 
            isOpen={isPlansOpen}
            onClose={() => setIsPlansOpen(false)}
          />

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

function HeaderBar({ 
  onOpenControlCenter, 
  onOpenPlans,
  activePlansCount 
}: { 
  onOpenControlCenter: () => void;
  onOpenPlans: () => void;
  activePlansCount: number;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const assignButtonRef = (node: HTMLButtonElement | null) => {
    btnRef.current = node;
  };
  const popRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openDelay = 120; // ms
  const closeDelay = 160; // ms
  const note = AIKA_MEMORY_NOTE;

  // outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  // focus return
  useEffect(() => {
    if (!open && btnRef.current) {
      btnRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  const clearTimers = () => {
    if (hoverTimerRef.current) { window.clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    if (open) return; // already open
    hoverTimerRef.current = window.setTimeout(() => { setOpen(true); }, openDelay);
  };
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) { window.clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    closeTimerRef.current = window.setTimeout(() => { setOpen(false); }, closeDelay);
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <h1 className="text-base sm:text-lg font-semibold tracking-wide text-white flex items-center gap-3">
        Aika Chat
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {open ? (
            <button
              ref={assignButtonRef}
              type="button"
              aria-label="Informasi memori Aika"
              aria-expanded="true"
              aria-controls="aika-memory-popover"
              onClick={() => setOpen(false)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/20 text-white hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition ring-2 ring-ugm-gold/40"
            >
              <Info className="h-4 w-4" />
            </button>
          ) : (
            <button
              ref={assignButtonRef}
              type="button"
              aria-label="Informasi memori Aika"
              aria-expanded="false"
              aria-controls="aika-memory-popover"
              onClick={() => setOpen(true)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
          {open && (
            <div
              id="aika-memory-popover"
              ref={popRef}
              role="dialog"
              aria-label="Penjelasan memori Aika"
              onMouseEnter={() => { if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null; } }}
              onMouseLeave={handleMouseLeave}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 md:w-80 rounded-lg border border-white/15 bg-[#0d2f6b]/95 backdrop-blur-xl p-4 pt-5 text-[11px] md:text-xs leading-relaxed text-white/70 shadow-2xl"
            >
              <span aria-hidden="true" className='pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1.5 h-3 w-3 rotate-45 rounded-sm border border-white/15 bg-[#0d2f6b]/95 backdrop-blur' />
              <p className="font-semibold text-white mb-1 text-xs">Mengapa Aika mengingatmu?</p>
              <p>{note}</p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[11px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15 focus:outline-none focus:ring-2 focus:ring-ugm-gold/40"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </h1>
      <div className="flex items-center gap-2">
        {/* Intervention Plans Button */}
        <button
          type="button"
          onClick={onOpenPlans}
          className="relative h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition"
          aria-label="Lihat rencana intervensi"
        >
          <ClipboardList className="h-4 w-4" />
          {activePlansCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-teal-500 text-white text-[9px] font-semibold flex items-center justify-center border border-white/30 shadow-sm">
              {activePlansCount > 9 ? '9+' : activePlansCount}
            </span>
          )}
        </button>
        
        {/* Control Center Button */}
        <button
          type="button"
          onClick={onOpenControlCenter}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition"
          aria-label="Buka pusat kontrol Aika"
        >
          <Settings className="h-4 w-4" />
        </button>
        
        <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[#FFCA40]/15 text-[#FFCA40] border border-[#FFCA40]/30">Beta</span>
      </div>
    </div>
  );
}
