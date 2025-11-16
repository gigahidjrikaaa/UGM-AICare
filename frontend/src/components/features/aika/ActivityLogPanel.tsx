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

function ActivityLogItem({ activity, isLatest }: ActivityLogItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = activity.details && Object.keys(activity.details).length > 0;
  
  const config = EVENT_CONFIG[activity.activity_type];
  const IconComponent = config.icon;
  const agentColor = AGENT_COLORS[activity.agent] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border border-white/10 bg-white/5 p-3 ${
        isLatest ? 'ring-2 ring-ugm-gold/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 ${config.color}`}>
          <IconComponent className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Agent Badge */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${agentColor}`}
              >
                {activity.agent}
              </span>

              {/* Event Type */}
              <span className="text-xs text-white/60">{activity.activity_type}</span>

              {/* Duration */}
              {activity.duration_ms !== null && activity.duration_ms !== undefined && (
                <span className="inline-flex items-center gap-1 text-xs text-white/40">
                  <Clock className="h-3 w-3" />
                  {formatDuration(activity.duration_ms)}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-xs text-white/40 whitespace-nowrap">
              {formatTime(activity.timestamp)}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-white/80 mb-1">{activity.message}</p>

          {/* Details Toggle */}
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-ugm-gold/70 hover:text-ugm-gold transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Details
            </button>
          )}

          {/* Expanded Details */}
          <AnimatePresence>
            {expanded && hasDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 overflow-hidden"
              >
                <pre className="text-xs bg-black/20 rounded p-2 overflow-x-auto text-white/60 font-mono">
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
