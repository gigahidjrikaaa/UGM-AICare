/**
 * Aika Enhanced Chat Page
 * 
 * This is the enhanced version of Aika chat that uses the LangGraph-orchestrated
 * Meta-Agent backend. It maintains the same UI/UX as the original Aika while
 * adding agent activity visibility.
 * 
 * Features:
 * - Same polished UI as original Aika
 * - LangGraph orchestration with agent visibility
 * - Real-time agent activity badges
 * - Risk level indicators
 * - Escalation notifications
 * - Original chat components (MessageBubble, ChatInput, ChatWindow)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Settings, ClipboardList, ListChecks, Activity } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAikaChat } from '@/hooks/useAikaChat';
import { ChatWindow } from '@/components/features/chat/ChatWindow';
import { ChatInput } from '@/components/features/chat/ChatInput';
import { AIKA_MEMORY_NOTE } from '@/constants/chat';
import { InterventionPlansSidebar } from '@/components/features/chat/InterventionPlansSidebar';
import { useInterventionPlans } from '@/hooks/useInterventionPlans';
import { AikaLoadingBubble } from '@/components/features/aika/AikaLoadingBubble';
import {
  AgentActivityBadge,
  RiskLevelIndicator,
  EscalationNotification,
  MetadataDisplay,
  AikaAvatar,
  AikaPoweredBadge,
} from '@/components/features/aika/AikaComponents';
import { ActivityLogPanel, ActivityIndicator } from '@/components/features/aika/ActivityLogPanel';
import { useActivityLog } from '@/hooks/useActivityLog';
import { ModelSelector } from '@/components/features/aika/ModelSelector';

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
  onOpenMetadata: () => void;
  onOpenPlans: () => void;
  onToggleActivityLog: () => void;
  activePlansCount: number;
  showMetadata: boolean;
  showActivityLog: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLoading?: boolean;
}

function HeaderBar({
  onOpenMetadata,
  onOpenPlans,
  onToggleActivityLog,
  activePlansCount,
  showMetadata,
  showActivityLog,
  selectedModel,
  onModelChange,
  isLoading = false,
}: HeaderBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-3">
        <AikaAvatar />
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-wide text-white">
            Aika Chat (Enhanced)
          </h1>
          <AikaPoweredBadge />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Model Selector */}
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          disabled={isLoading}
        />
        
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
          title="Show/hide agent activity log"
        >
          <Activity className="h-4 w-4" />
        </button>
        
        {/* Metadata toggle button */}
        <button
          type="button"
          onClick={onOpenMetadata}
          className={`h-7 w-7 inline-flex items-center justify-center rounded-md border border-white/15 ${
            showMetadata ? 'bg-purple-500/30' : 'bg-white/10'
          } hover:bg-white/20 text-white/80 hover:text-white text-xs focus:outline-none focus:ring-2 focus:ring-ugm-gold/40 transition`}
          aria-label="Toggle metadata display"
          title="Show/hide technical details"
        >
          <Info className="h-4 w-4" />
        </button>
        
        {/* LangGraph badge */}
        <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[#FFCA40]/15 text-[#FFCA40] border border-[#FFCA40]/30">
          LangGraph
        </span>
      </div>
    </div>
  );
}

export default function AikaEnhancedPage() {
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const [showMetadata, setShowMetadata] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch intervention plans
  const { data: plansData, refetch: refetchPlans } = useInterventionPlans(true);

  // Use the Aika chat hook
  const {
    messages,
    inputValue,
    isLoading,
    activeAgents,
    error,
    lastMetadata,
    handleInputChange,
    handleSendMessage,
  } = useAikaChat({
    sessionId: 'aika-session-' + new Date().getTime(),
    showAgentActivity: true,
    showRiskIndicators: true,
    preferredModel: selectedModel,
  });

  // Activity logging
  const {
    activities,
    latestActivity,
    isReceiving,
  } = useActivityLog({
    enabled: true,
    maxLogs: 100,
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
      <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-2 md:p-4 lg:p-6 pt-24 gap-4">
        {/* Main Layout Container */}
        <div className="w-full max-w-7xl h-[calc(100vh-10rem)] flex gap-4">
          {/* Chat Panel */}
          <div className={`${showActivityLog ? 'w-2/3' : 'w-full'} flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden transition-all duration-300`}>
            <HeaderBar 
              onOpenMetadata={() => setShowMetadata(!showMetadata)} 
              onToggleActivityLog={() => setShowActivityLog(!showActivityLog)}
              onOpenPlans={() => setIsPlansOpen(true)}
              activePlansCount={plansData?.total || 0}
              showMetadata={showMetadata}
              showActivityLog={showActivityLog}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              isLoading={isLoading}
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
              
              {/* Agent Activity & Risk Display */}
              {lastMetadata && (
                <div className="px-4 pt-3 space-y-2">
                  {lastMetadata.agents_invoked.length > 0 && (
                    <AgentActivityBadge
                      agents={lastMetadata.agents_invoked}
                      processingTime={lastMetadata.processing_time_ms}
                    />
                  )}
                  {lastMetadata.risk_assessment && lastMetadata.risk_assessment.risk_level !== 'low' && (
                    <RiskLevelIndicator
                      assessment={lastMetadata.risk_assessment}
                    showFactors={lastMetadata.risk_assessment.risk_level === 'high' || lastMetadata.risk_assessment.risk_level === 'critical'}
                  />
                )}
                {lastMetadata.escalation_triggered && lastMetadata.case_id && (
                  <EscalationNotification caseId={lastMetadata.case_id} />
                )}
                {showMetadata && <MetadataDisplay metadata={lastMetadata} />}
              </div>
            )}
            
            {/* Chat Window - using original component */}
            <ChatWindow 
              messages={messages}
              chatContainerRef={chatContainerRef}
            />
            
            {/* Loading indicator with agent activity */}
            {isLoading && (
              <div className="px-4 pb-4">
                <AikaLoadingBubble activeAgents={activeAgents} />
              </div>
            )}
            
            {/* Chat Input - using original component */}
            <div className="p-4">
              <ChatInput
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onSendMessage={handleSendMessage}
                onStartModule={() => {}} // Disabled for now
                isLoading={isLoading}
                currentMode="standard"
                availableModules={[]}
                isLiveTalkActive={false}
                toggleLiveTalk={() => {}} // Disabled for now
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
        <InterventionPlansSidebar 
          isOpen={isPlansOpen}
          onClose={() => setIsPlansOpen(false)}
        />

        {/* Footer credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-3 text-center text-xs text-gray-300/70"
        >
          <p>Disclaimer: Aika adalah AI dan bukan pengganti profesional medis.</p>
          <p className="mt-1">Built with ❤️ by UGM AICare Team • Powered by LangGraph</p>
        </motion.div>
      </div>
    </>
  );
}