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
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <AikaAvatar />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#001D58]" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
            Aika Chat
            <AikaPoweredBadge />
          </h1>
          <p className="text-xs text-white/60 font-medium">
            AI Mental Health Assistant
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Model Selector - Cleaner look */}
        <div className="hidden sm:block">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            disabled={isLoading}
          />
        </div>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Tools Group */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {/* Plans button */}
          <button
            type="button"
            onClick={onOpenPlans}
            className="relative h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            aria-label="View intervention plans"
            title="Intervention Plans"
          >
            <ListChecks className="h-4 w-4" />
            {activePlansCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-[#001D58]" />
            )}
          </button>

          {/* Activity log toggle button */}
          <button
            type="button"
            onClick={onToggleActivityLog}
            className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors ${showActivityLog ? 'bg-white/10 text-[#FFCA40]' : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            aria-label="Toggle activity log"
            title="Agent Activity"
          >
            <Activity className="h-4 w-4" />
          </button>

          {/* Metadata toggle button */}
          <button
            type="button"
            onClick={onOpenMetadata}
            className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors ${showMetadata ? 'bg-white/10 text-purple-400' : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            aria-label="Toggle metadata display"
            title="Technical Details"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
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
    addActivity,
  } = useActivityLog({
    enabled: true,
    maxLogs: 100,
  });

  // Effect to ingest activity logs from metadata
  useEffect(() => {
    if (lastMetadata?.activity_logs && Array.isArray(lastMetadata.activity_logs)) {
      // Sort by start time to ensure chronological order
      const sortedLogs = [...lastMetadata.activity_logs].sort((a: any, b: any) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );

      sortedLogs.forEach((log: any) => {
        // Infer agent from node name
        let agent = 'Aika';
        if (log.name.includes('sta')) agent = 'STA';
        else if (log.name.includes('tca')) agent = 'TCA';
        else if (log.name.includes('cma')) agent = 'CMA';
        else if (log.name.includes('ia')) agent = 'IA';

        // Determine activity type
        let type: any = 'node_complete';
        if (log.status === 'failed') type = 'agent_error';

        addActivity({
          timestamp: log.completed_at || log.started_at || new Date().toISOString(),
          activity_type: type,
          agent: agent,
          message: `Executed node: ${log.name}`,
          duration_ms: log.duration_ms,
          details: log
        });
      });
    }
  }, [lastMetadata, addActivity]);

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
      <div className="min-h-screen w-full text-white flex flex-col items-center justify-center p-2 md:p-4 lg:p-6 pt-40 gap-4">
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
                isLoading={isLoading}
                activeAgents={activeAgents}
              />

              {/* Chat Input - using original component */}
              <div className="p-4">
                <ChatInput
                  inputValue={inputValue}
                  onInputChange={handleInputChange}
                  onSendMessage={handleSendMessage}
                  onStartModule={() => { }} // Disabled for now
                  isLoading={isLoading}
                  currentMode="standard"
                  availableModules={[]}
                  isLiveTalkActive={false}
                  toggleLiveTalk={() => { }} // Disabled for now
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