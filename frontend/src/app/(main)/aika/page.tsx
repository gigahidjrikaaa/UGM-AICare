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
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
      {/* Left: Avatar & Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-ugm-gold/50 shadow-lg">
            <Image src="/aika-human.jpeg" alt="Aika" width={36} height={36} className="object-cover w-full h-full" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#001D58]" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            Aika
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-ugm-gold/20 text-ugm-gold border border-ugm-gold/30">
              AI
            </span>
          </h1>
          <p className="text-[11px] text-white/50">
            Mental Health Assistant
          </p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Model Selector - Compact */}
        <div className="hidden sm:block">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            disabled={isLoading}
          />
        </div>

        {/* Tool Buttons */}
        <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-lg p-0.5 border border-white/10">
          <button
            type="button"
            onClick={onOpenPlans}
            className="relative h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="View intervention plans"
            title="Intervention Plans"
          >
            <ListChecks className="h-3.5 w-3.5" />
            {activePlansCount > 0 && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleActivityLog}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors ${showActivityLog ? 'bg-white/10 text-ugm-gold' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
            aria-label="Toggle activity log"
            title="Agent Activity"
          >
            <Activity className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenMetadata}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors ${showMetadata ? 'bg-white/10 text-purple-400' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
            aria-label="Toggle metadata display"
            title="Technical Details"
          >
            <Info className="h-3.5 w-3.5" />
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

  // Track processed metadata to prevent duplicate logging
  const processedMetadataRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const hasLoggedGreetingRef = useRef<boolean>(false);

  // Log initial greeting when component mounts
  useEffect(() => {
    if (!hasLoggedGreetingRef.current && messages.length > 0) {
      const firstMessage = messages[0];
      if (firstMessage.role === 'assistant') {
        addActivity({
          timestamp: new Date().toISOString(),
          activity_type: 'agent_complete',
          agent: 'Aika',
          message: 'Aika initialized and ready',
          duration_ms: null,
          details: { event: 'greeting', content_preview: firstMessage.content.substring(0, 50) + '...' }
        });
        hasLoggedGreetingRef.current = true;
      }
    }
  }, [messages, addActivity]);

  // Log when user sends a message or error occurs (detect new messages)
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current);
      newMessages.forEach((msg) => {
        if (msg.role === 'user') {
          addActivity({
            timestamp: msg.created_at || new Date().toISOString(),
            activity_type: 'info',
            agent: 'Aika',
            message: `User message received: "${msg.content.substring(0, 40)}${msg.content.length > 40 ? '...' : ''}"`,
            duration_ms: null,
            details: { event: 'user_message', message_id: msg.id }
          });
        }
        // Detect error messages
        if (msg.role === 'assistant' && msg.isError) {
          addActivity({
            timestamp: msg.created_at || new Date().toISOString(),
            activity_type: 'agent_error',
            agent: 'Aika',
            message: `Error occurred: ${msg.content}`,
            duration_ms: null,
            details: { event: 'error_response', message_id: msg.id, error_content: msg.content }
          });
        }
      });
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, addActivity]);

  // Log when loading state changes (agent processing start/end)
  const prevLoadingRef = useRef<boolean>(false);
  useEffect(() => {
    if (isLoading && !prevLoadingRef.current) {
      // Processing started
      addActivity({
        timestamp: new Date().toISOString(),
        activity_type: 'agent_start',
        agent: 'Aika',
        message: 'Processing request...',
        duration_ms: null,
        details: { event: 'processing_start' }
      });
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, addActivity]);

  // Log active agents when they change
  const prevActiveAgentsRef = useRef<string[]>([]);
  useEffect(() => {
    if (activeAgents.length > 0) {
      const newAgents = activeAgents.filter(a => !prevActiveAgentsRef.current.includes(a));
      newAgents.forEach((agent) => {
        addActivity({
          timestamp: new Date().toISOString(),
          activity_type: 'agent_start',
          agent: agent,
          message: `${agent} agent activated`,
          duration_ms: null,
          details: { event: 'agent_activated' }
        });
      });
    }
    prevActiveAgentsRef.current = activeAgents;
  }, [activeAgents, addActivity]);

  // Log errors when they occur
  useEffect(() => {
    if (error) {
      addActivity({
        timestamp: new Date().toISOString(),
        activity_type: 'agent_error',
        agent: 'Aika',
        message: `Error: ${error}`,
        duration_ms: null,
        details: { event: 'error', error: error }
      });
    }
  }, [error, addActivity]);

  // Effect to ingest activity logs from metadata
  useEffect(() => {
    if (lastMetadata?.activity_logs && Array.isArray(lastMetadata.activity_logs)) {
      // Create a unique identifier for this metadata to prevent duplicate logging
      const metadataId = JSON.stringify({
        agents: lastMetadata.agents_invoked,
        time: lastMetadata.processing_time_ms,
        logsCount: lastMetadata.activity_logs.length
      });

      if (processedMetadataRef.current === metadataId) {
        return; // Already processed this metadata
      }
      processedMetadataRef.current = metadataId;

      // Log response completion first
      addActivity({
        timestamp: new Date().toISOString(),
        activity_type: 'agent_complete',
        agent: 'Aika',
        message: `Response generated in ${lastMetadata.processing_time_ms}ms`,
        duration_ms: lastMetadata.processing_time_ms,
        details: {
          event: 'response_complete',
          agents_invoked: lastMetadata.agents_invoked,
          risk_level: lastMetadata.risk_assessment?.risk_level
        }
      });

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

      // Log risk assessment if present
      if (lastMetadata.risk_assessment && lastMetadata.risk_assessment.risk_level !== 'low') {
        addActivity({
          timestamp: new Date().toISOString(),
          activity_type: 'risk_assessment',
          agent: 'Aika',
          message: `Risk level detected: ${lastMetadata.risk_assessment.risk_level.toUpperCase()}`,
          duration_ms: null,
          details: lastMetadata.risk_assessment
        });
      }

      // Log escalation if triggered
      if (lastMetadata.escalation_triggered && lastMetadata.case_id) {
        addActivity({
          timestamp: new Date().toISOString(),
          activity_type: 'case_created',
          agent: 'CMA',
          message: `Case escalated: ${lastMetadata.case_id}`,
          duration_ms: null,
          details: { case_id: lastMetadata.case_id, escalation_triggered: true }
        });
      }

      // Log if any intervention-related actions were taken
      const interventionActions = lastMetadata.actions_taken?.filter(
        action => action.includes('intervention') || action.includes('plan')
      );
      if (interventionActions && interventionActions.length > 0) {
        addActivity({
          timestamp: new Date().toISOString(),
          activity_type: 'intervention_created',
          agent: 'IA',
          message: `Intervention actions: ${interventionActions.join(', ')}`,
          duration_ms: null,
          details: { actions: interventionActions }
        });
      }
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
      {/* Content area - Fixed positioning to avoid navbar clash */}
      <div className="fixed inset-0 top-[72px] md:top-[80px] w-full text-white flex flex-col p-2 md:p-4 lg:p-6 gap-4">
        {/* Main Layout Container */}
        <div className="w-full max-w-7xl mx-auto flex-1 flex gap-4 overflow-hidden">
          {/* Chat Panel */}
          <div className={`${showActivityLog ? 'lg:w-2/3' : 'w-full'} flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden transition-all duration-300 min-h-0`}>
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
                onCardSelect={handleSendMessage}
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
              className="hidden lg:flex lg:w-1/3 flex-col min-h-0 overflow-hidden"
            >
              <ActivityLogPanel
                activities={activities}
                isOpen={showActivityLog}
                onClose={() => setShowActivityLog(false)}
                maxHeight="100%"
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
          className="flex-shrink-0 py-2 text-center text-xs text-gray-300/70"
        >
          <p>Disclaimer: Aika adalah AI dan bukan pengganti profesional medis.</p>
          <p className="mt-1">Built with ❤️ by UGM AICare Team • Powered by LangGraph</p>
        </motion.div>
      </div>
    </>
  );
}