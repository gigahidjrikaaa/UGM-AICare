/**
 * Aika Chat with Activity Monitoring
 * 
 * Enhanced version of Aika chat with real-time WebSocket support
 * and comprehensive activity logging panel.
 * 
 * Features:
 * - Real-time WebSocket messaging
 * - Live agent activity logging
 * - Activity panel with filtering
 * - Agent status indicators
 * - Performance metrics
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, Info, ListChecks, Wifi, WifiOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAikaWebSocket } from '@/hooks/useAikaWebSocket';
import { ChatWindow } from '@/components/features/chat/ChatWindow';
import { ChatInput } from '@/components/features/chat/ChatInput';
import { InterventionPlansSidebar } from '@/components/features/chat/InterventionPlansSidebar';
import { useInterventionPlans } from '@/hooks/useInterventionPlans';
import { AikaLoadingBubble } from '@/components/features/aika/AikaLoadingBubble';
import {
  AikaAvatar,
  AikaPoweredBadge,
} from '@/components/features/aika/AikaComponents';
import {
  ActivityLogPanel,
  ActivityIndicator,
} from '@/components/features/aika/ActivityLogPanel';

// Loading Component
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

// Header Bar Component
interface HeaderBarProps {
  onToggleActivityLog: () => void;
  onOpenPlans: () => void;
  activePlansCount: number;
  showActivityLog: boolean;
  isConnected: boolean;
}

function HeaderBar({
  onToggleActivityLog,
  onOpenPlans,
  activePlansCount,
  showActivityLog,
  isConnected,
}: HeaderBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-3">
        <AikaAvatar />
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-wide text-white">
            Aika Monitor
          </h1>
          <div className="flex items-center gap-2">
            <AikaPoweredBadge />
            {/* Connection status */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-400" />
                  <span className="text-[10px] text-green-400">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Plans button */}
        <button
          type="button"
          onClick={onOpenPlans}
          className="relative h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition"
          aria-label="View intervention plans"
          title="View intervention plans"
        >
          <ListChecks className="h-4 w-4" />
          {activePlansCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
              {activePlansCount}
            </span>
          )}
        </button>

        {/* Activity log toggle button */}
        <button
          type="button"
          onClick={onToggleActivityLog}
          className={`h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 ${
            showActivityLog ? 'bg-ugm-gold/30 ring-2 ring-ugm-gold/40' : 'bg-white/10'
          } hover:bg-white/20 text-white/80 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition`}
          aria-label="Toggle activity log"
          title="Show/hide activity log"
        >
          <Activity className="h-4 w-4" />
        </button>

        {/* WebSocket badge */}
        <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[#FFCA40]/15 text-[#FFCA40] border border-[#FFCA40]/30">
          WebSocket
        </span>
      </div>
    </div>
  );
}

export default function AikaMonitorPage() {
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch intervention plans
  const { data: plansData, refetch: refetchPlans } = useInterventionPlans(true);

  // Use WebSocket hook
  const {
    messages,
    inputValue,
    isLoading,
    isConnected,
    activities,
    latestActivity,
    activeAgents,
    isReceiving,
    sendMessage,
    handleInputChange,
  } = useAikaWebSocket({
    sessionId: 'aika-ws-' + new Date().getTime(),
    enableActivityLog: true,
  });

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
    return <LoadingIndicator />;
  }

  return (
    <>
      {/* Content area */}
      <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-2 md:p-4 lg:p-6 gap-4">
        {/* Main Chat Container */}
        <div className="w-full max-w-5xl h-[calc(100vh-10rem)] flex gap-4">
          {/* Chat Panel */}
          <div className={`${showActivityLog ? 'w-2/3' : 'w-full'} flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden transition-all duration-300`}>
            <HeaderBar
              onToggleActivityLog={() => setShowActivityLog(!showActivityLog)}
              onOpenPlans={() => setIsPlansOpen(true)}
              activePlansCount={plansData?.total || 0}
              showActivityLog={showActivityLog}
              isConnected={isConnected}
            />

            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Agent Activity Indicator */}
              {isReceiving && activeAgents.length > 0 && (
                <div className="px-4 pt-3">
                  <ActivityIndicator
                    activeAgents={activeAgents}
                    latestActivity={latestActivity || undefined}
                  />
                </div>
              )}

              {/* Chat Window */}
              <ChatWindow messages={messages} chatContainerRef={chatContainerRef} />

              {/* Loading indicator */}
              {isLoading && (
                <div className="px-4 pb-4">
                  <AikaLoadingBubble activeAgents={activeAgents} />
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4">
                <ChatInput
                  inputValue={inputValue}
                  onInputChange={handleInputChange}
                  onSendMessage={sendMessage}
                  onStartModule={() => {}}
                  isLoading={isLoading}
                  currentMode="standard"
                  availableModules={[]}
                  isLiveTalkActive={false}
                  toggleLiveTalk={() => {}}
                  interruptOnEnter={false}
                />
              </div>
            </div>
          </div>

          {/* Activity Log Panel */}
          {showActivityLog && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-1/3 flex flex-col"
            >
              <ActivityLogPanel
                activities={activities}
                isOpen={showActivityLog}
                onClose={() => setShowActivityLog(false)}
                maxHeight="calc(100vh - 10rem)"
              />
            </motion.div>
          )}
        </div>

        {/* Intervention Plans Sidebar */}
        <InterventionPlansSidebar isOpen={isPlansOpen} onClose={() => setIsPlansOpen(false)} />

        {/* Footer credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-300/70"
        >
          <p>Real-time agent activity monitoring • WebSocket enabled</p>
          <p className="mt-1">Built with ❤️ by UGM AICare Team • Powered by LangGraph</p>
        </motion.div>
      </div>
    </>
  );
}
