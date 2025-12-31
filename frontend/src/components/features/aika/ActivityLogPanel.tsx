/**
 * Activity Log Panel Component
 * 
 * Displays real-time agent activity logs during chat sessions.
 * Shows what agents are doing, how long operations take, and detailed event information.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Info,
  Layers,
  MessageSquare,
  Play,
  Route,
  Shield,
  Sparkles,
  XCircle,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { ActivityLog, ActivityType } from '@/types/activity';

interface ActivityLogPanelProps {
  activities: ActivityLog[];
  isOpen?: boolean;
  onClose?: () => void;
  maxHeight?: string;
}

// Agent badge colors
const AGENT_COLORS: Record<string, string> = {
  STA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TCA: 'bg-green-500/20 text-green-400 border-green-500/30',
  CMA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  IA: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Aika: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

// Event type icons and colors
const EVENT_CONFIG: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  agent_start: { icon: Play, color: 'text-blue-400' },
  agent_complete: { icon: CheckCircle, color: 'text-green-400' },
  agent_error: { icon: XCircle, color: 'text-red-400' },
  node_start: { icon: Layers, color: 'text-cyan-400' },
  node_complete: { icon: CheckCircle, color: 'text-cyan-400' },
  routing_decision: { icon: Route, color: 'text-purple-400' },
  risk_assessment: { icon: Shield, color: 'text-orange-400' },
  intervention_created: { icon: Sparkles, color: 'text-green-400' },
  case_created: { icon: AlertTriangle, color: 'text-red-400' },
  llm_call: { icon: Cpu, color: 'text-indigo-400' },
  info: { icon: Info, color: 'text-gray-400' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400' },
};

// Format timestamp
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  } catch {
    return timestamp;
  }
}

// Format duration
function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Activity Log Item Component
interface ActivityLogItemProps {
  activity: ActivityLog;
  isLatest: boolean;
}

// Helper to extract readable reasoning from details
function extractReasoning(details: Record<string, any> | undefined): { reasoning: string | null; keyInfo: Record<string, any> } {
  if (!details) return { reasoning: null, keyInfo: {} };
  
  const keyInfo: Record<string, any> = {};
  let reasoning: string | null = null;
  
  // Extract specific meaningful fields
  if (details.reasoning) reasoning = details.reasoning;
  if (details.reason) reasoning = details.reason;
  if (details.decision) keyInfo.decision = details.decision;
  if (details.risk_level) keyInfo.risk_level = details.risk_level;
  if (details.risk_score) keyInfo.risk_score = details.risk_score;
  if (details.risk_factors && Array.isArray(details.risk_factors)) {
    keyInfo.risk_factors = details.risk_factors;
  }
  if (details.severity) keyInfo.severity = details.severity;
  if (details.intent) keyInfo.intent = details.intent;
  if (details.intervention_type) keyInfo.intervention_type = details.intervention_type;
  if (details.case_id) keyInfo.case_id = details.case_id;
  if (details.model) keyInfo.model = details.model;
  if (details.purpose) keyInfo.purpose = details.purpose;
  if (details.error) keyInfo.error = details.error;
  if (details.agents_invoked) keyInfo.agents_invoked = details.agents_invoked;
  
  return { reasoning, keyInfo };
}

function ActivityLogItem({ activity, isLatest }: ActivityLogItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = activity.details && Object.keys(activity.details).length > 0;
  
  const config = EVENT_CONFIG[activity.activity_type];
  const IconComponent = config.icon;
  const agentColor = AGENT_COLORS[activity.agent] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  
  const { reasoning, keyInfo } = extractReasoning(activity.details);
  const hasKeyInfo = Object.keys(keyInfo).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-3 ${
        isLatest ? 'ring-1 ring-ugm-gold/40' : ''
      } ${activity.activity_type === 'agent_error' ? 'border-red-500/30 bg-red-500/5' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          activity.activity_type === 'agent_error' ? 'bg-red-500/20' : 'bg-white/10'
        }`}>
          <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Agent Badge */}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${agentColor}`}>
                {activity.agent}
              </span>

              {/* Duration */}
              {activity.duration_ms !== null && activity.duration_ms !== undefined && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-white/40">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDuration(activity.duration_ms)}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-[10px] text-white/30 whitespace-nowrap">
              {formatTime(activity.timestamp)}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-white/80">{activity.message}</p>

          {/* Key Info Pills - Show important info inline */}
          {hasKeyInfo && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {keyInfo.risk_level && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  keyInfo.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                  keyInfo.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  keyInfo.risk_level === 'moderate' || keyInfo.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  Risk: {keyInfo.risk_level}
                </span>
              )}
              {keyInfo.severity && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  keyInfo.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                  keyInfo.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  Severity: {keyInfo.severity}
                </span>
              )}
              {keyInfo.intent && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                  Intent: {keyInfo.intent}
                </span>
              )}
              {keyInfo.decision && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                  → {keyInfo.decision}
                </span>
              )}
              {keyInfo.model && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                  {keyInfo.model}
                </span>
              )}
              {keyInfo.agents_invoked && Array.isArray(keyInfo.agents_invoked) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ugm-gold/20 text-ugm-gold">
                  Agents: {keyInfo.agents_invoked.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Reasoning - Always show if available */}
          {reasoning && (
            <div className="mt-2 text-xs text-white/60 italic bg-white/5 rounded-lg px-2.5 py-2 border-l-2 border-ugm-gold/50">
              💭 {reasoning}
            </div>
          )}

          {/* Risk Factors - Show as list */}
          {keyInfo.risk_factors && keyInfo.risk_factors.length > 0 && (
            <div className="mt-2 text-xs text-white/50">
              <span className="text-white/40">Risk factors:</span>
              <ul className="mt-0.5 space-y-0.5 pl-3">
                {keyInfo.risk_factors.map((factor: string, idx: number) => (
                  <li key={idx} className="list-disc">{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Display */}
          {keyInfo.error && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-2.5 py-2 border-l-2 border-red-500/50">
              ⚠️ {keyInfo.error}
            </div>
          )}

          {/* Raw Details Toggle */}
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors mt-2"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Raw data
            </button>
          )}

          {/* Expanded Raw Details */}
          <AnimatePresence>
            {expanded && hasDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 overflow-hidden"
              >
                <pre className="text-[10px] bg-black/30 rounded-lg p-2 overflow-x-auto text-white/50 font-mono">
                  {JSON.stringify(activity.details, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Main Activity Log Panel
export function ActivityLogPanel({
  activities,
  isOpen = true,
  onClose,
  maxHeight = '400px',
}: ActivityLogPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activities, autoScroll]);

  // Get unique agents and event types for filters
  const uniqueAgents = Array.from(new Set(activities.map((a) => a.agent)));
  const uniqueTypes = Array.from(new Set(activities.map((a) => a.activity_type)));

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    if (filterAgent !== 'all' && activity.agent !== filterAgent) return false;
    if (filterType !== 'all' && activity.activity_type !== filterType) return false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-[#001d58]/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-ugm-gold" />
          <h3 className="text-sm font-semibold text-white">Agent Activity Log</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-ugm-gold/20 text-ugm-gold text-xs">
            {filteredActivities.length}
          </span>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close activity log"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/5">
        <Filter className="h-3 w-3 text-white/40" />
        
        {/* Agent Filter */}
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          title="Filter by agent"
          className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ugm-gold/40"
        >
          <option value="all">All Agents</option>
          {uniqueAgents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          title="Filter by event type"
          className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ugm-gold/40"
        >
          <option value="all">All Events</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* Auto-scroll Toggle */}
        <label className="flex items-center gap-1 text-xs text-white/60 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-white/20"
          />
          Auto-scroll
        </label>
      </div>

      {/* Activities List */}
      <div
        ref={containerRef}
        className="overflow-y-auto p-4 space-y-2"
        style={{ maxHeight: maxHeight }}
      >
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activities yet</p>
            <p className="text-xs mt-1">Send a message to see agent activity</p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => (
            <ActivityLogItem
              key={`${activity.timestamp}-${index}`}
              activity={activity}
              isLatest={index === filteredActivities.length - 1}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 text-xs text-white/40 text-center">
          Showing {filteredActivities.length} of {activities.length} events
        </div>
      )}
    </div>
  );
}

// Compact Activity Indicator (for showing current agent activity)
interface ActivityIndicatorProps {
  activeAgents: string[];
  latestActivity?: ActivityLog;
}

export function ActivityIndicator({ activeAgents, latestActivity }: ActivityIndicatorProps) {
  if (activeAgents.length === 0 && !latestActivity) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ugm-gold/10 border border-ugm-gold/30"
    >
      <Activity className="h-4 w-4 text-ugm-gold animate-pulse" />
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/80">Agents active:</span>
        {activeAgents.map((agent) => {
          const color = AGENT_COLORS[agent] || 'bg-gray-500/20 text-gray-400';
          return (
            <span
              key={agent}
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}
            >
              {agent}
            </span>
          );
        })}
      </div>
      {latestActivity && (
        <span className="text-xs text-white/60 ml-auto">
          {latestActivity.message}
        </span>
      )}
    </motion.div>
  );
}
