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

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAikaChat, type ToolActivityLog } from '@/hooks/useAikaChat';
import { ChatWindow } from '@/components/features/chat/ChatWindow';
import { ChatInput } from '@/components/features/chat/ChatInput';
import { AIKA_MEMORY_NOTE } from '@/constants/chat';
import { useInterventionPlans } from '@/hooks/useInterventionPlans';
import { AikaLoadingBubble } from '@/components/features/aika/AikaLoadingBubble';
import {
  AgentActivityBadge,
  RiskLevelIndicator,
  EscalationNotification,
  AikaAvatar,
  AikaPoweredBadge,
} from '@/components/features/aika/AikaComponents';
import { ActivityLogPanel, ActivityIndicator, type ViewMode } from '@/components/features/aika/ActivityLogPanel';
import { useActivityLog } from '@/hooks/useActivityLog';
import { ModelSelector } from '@/components/features/aika/ModelSelector';

// Loading Component
const LoadingIndicator = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-linear-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
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
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLoading?: boolean;
}

function HeaderBar({
  selectedModel,
  onModelChange,
  isLoading = false,
}: HeaderBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/3 backdrop-blur-md">
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
      </div>
    </div>
  );
}

export default function AikaEnhancedPage() {
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Track floating panel view modes for layout adjustment
  const [activityLogViewMode, setActivityLogViewMode] = useState<ViewMode>('minimized');

  // Calculate left margin based on activity log state
  // Activity log is always visible on desktop (lg+), hidden on mobile
  // Margin = panel width + left offset (1rem) + gap (0.5rem)
  // Panel widths: minimized=4rem (64px), compact=20rem (320px), expanded=24rem/26.25rem (384px/420px)
  const getLeftMargin = () => {
    // On mobile/tablet, no margin needed (panels overlay)
    // On desktop (lg+), apply margin based on view mode
    switch (activityLogViewMode) {
      case 'expanded': return 'lg:ml-[25.5rem] xl:ml-[28rem]';
      case 'compact': return 'lg:ml-[21.5rem]';
      case 'minimized': return 'lg:ml-[5.5rem]';
      default: return 'lg:ml-[5.5rem]';
    }
  };

  // Fetch intervention plans
  const {
    data: plansData,
    isLoading: interventionPlansLoading,
    error: interventionPlansError,
    refetch: refetchPlans,
  } = useInterventionPlans(true);

  // Activity logging - must be declared before useAikaChat to pass addActivity
  const {
    activities,
    latestActivity,
    isReceiving,
    addActivity,
  } = useActivityLog({
    enabled: true,
    maxLogs: 100,
  });

  // Handler to convert tool activity logs to activity log format
  const handleToolActivity = useCallback((toolActivity: ToolActivityLog) => {
    // Map tool event types to activity types
    const activityTypeMap: Record<string, 'tool_start' | 'tool_end' | 'tool_use' | 'info'> = {
      'tool_start': 'tool_start',
      'tool_end': 'tool_end',
      'tool_use': 'tool_use',
      'status': 'info',
    };

    const activityType = activityTypeMap[toolActivity.type] || 'info';
    
    // Build message based on event type
    let message = '';
    if (toolActivity.type === 'tool_start' && toolActivity.tools?.length) {
      message = `Starting tools: ${toolActivity.tools.join(', ')}`;
    } else if (toolActivity.type === 'tool_end' && toolActivity.tool) {
      message = `Tool completed: ${toolActivity.tool}`;
    } else if (toolActivity.type === 'tool_use' && toolActivity.tool) {
      message = `Using tool: ${toolActivity.tool}`;
    } else if (toolActivity.message) {
      message = toolActivity.message;
    } else {
      message = `Tool event: ${toolActivity.type}`;
    }

    addActivity({
      timestamp: toolActivity.timestamp,
      activity_type: activityType,
      agent: 'Aika',
      message,
      duration_ms: null,
      details: {
        event: toolActivity.type,
        tool: toolActivity.tool,
        tools: toolActivity.tools,
      }
    });
  }, [addActivity]);

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
    onToolActivity: handleToolActivity,
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

  // Log when user sends a message or Aika responds (detect new messages)
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
        // Log Aika's response (non-error assistant messages after greeting)
        if (msg.role === 'assistant' && !msg.isError && hasLoggedGreetingRef.current) {
          addActivity({
            timestamp: msg.created_at || new Date().toISOString(),
            activity_type: 'agent_complete',
            agent: 'Aika',
            message: `Aika responded: "${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}"`,
            duration_ms: null,
            details: { 
              event: 'aika_response', 
              message_id: msg.id,
              content_length: msg.content.length,
              content_preview: msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : '')
            }
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
      <div className="fixed inset-0 top-[72px] md:top-20 w-full text-white flex flex-col p-2 md:p-4 lg:p-6 gap-4">
        {/* Main Layout Container - Adjusts margins based on floating panel states */}
        <div className={`w-full max-w-7xl mx-auto flex-1 flex gap-4 overflow-hidden transition-all duration-300 min-w-0 ${getLeftMargin()}`}>
          {/* Chat Panel - Full width now since activity log is floating */}
          <div className="w-full min-w-0 flex flex-col bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden transition-all duration-300 min-h-0">
            <HeaderBar
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
        </div>

        {/* Activity Log Panel - Floating on the left, always visible on desktop */}
        <div className="hidden lg:block">
          <ActivityLogPanel
            activities={activities}
            metadata={lastMetadata ?? null}
            interventionPlans={plansData}
            interventionPlansLoading={interventionPlansLoading}
            interventionPlansError={interventionPlansError}
            onRefreshInterventionPlans={refetchPlans}
            alwaysVisible={true}
            onViewModeChange={setActivityLogViewMode}
          />
        </div>

        {/* Footer credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="shrink-0 py-2 text-center text-xs text-gray-300/70"
        >
          <p>Disclaimer: Aika adalah AI dan bukan pengganti profesional medis.</p>
          <p className="mt-1">Built with ❤️ by UGM AICare Team • Powered by LangGraph</p>
        </motion.div>
      </div>
    </>
  );
}