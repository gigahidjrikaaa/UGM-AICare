/**
 * Aika UI Components
 * 
 * Reusable components for displaying Aika Meta-Agent activity,
 * risk assessments, and escalation notifications.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import type { AikaRiskAssessment, AikaMetadata } from '@/hooks/useAika';

/**
 * Agent Activity Badge
 * Shows which agents Aika consulted for this response
 */
interface AgentActivityBadgeProps {
  agents: string[];
  processingTime?: number;
}

export function AgentActivityBadge({ agents, processingTime }: AgentActivityBadgeProps) {
  if (agents.length === 0) return null;

  const agentNames: Record<string, string> = {
    STA: 'Safety',
    SCA: 'Support',
    SDA: 'Service',
    IA: 'Insights',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-xs text-white/70 bg-white/5 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10"
    >
      <Activity className="h-3.5 w-3.5 text-purple-400" />
      <span>
        Consulted: {agents.map(a => agentNames[a] || a).join(', ')}
      </span>
      {processingTime && (
        <span className="text-white/50">• {processingTime}ms</span>
      )}
    </motion.div>
  );
}

/**
 * Risk Level Indicator
 * Visual indicator for safety risk assessment
 */
interface RiskLevelIndicatorProps {
  assessment: AikaRiskAssessment;
  showFactors?: boolean;
}

export function RiskLevelIndicator({ assessment, showFactors = false }: RiskLevelIndicatorProps) {
  const { risk_level, risk_score, confidence, risk_factors } = assessment;

  const riskConfig = {
    critical: {
      label: 'Critical Risk',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: AlertTriangle,
      pulseClass: 'animate-pulse',
    },
    high: {
      label: 'High Risk',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      icon: AlertTriangle,
      pulseClass: '',
    },
    moderate: {
      label: 'Moderate Risk',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: AlertTriangle,
      pulseClass: '',
    },
    low: {
      label: 'Low Risk',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: CheckCircle,
      pulseClass: '',
    },
  };

  const config = riskConfig[risk_level] || riskConfig.low;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border ${config.border} ${config.bg} p-3 space-y-2`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.color} ${config.pulseClass}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-white/50">
          (Confidence: {Math.round(confidence * 100)}%)
        </span>
      </div>

      {showFactors && risk_factors.length > 0 && (
        <div className="text-xs text-white/70 space-y-1">
          <div className="font-medium">Risk Factors:</div>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            {risk_factors.map((factor, idx) => (
              <li key={idx}>{factor}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Escalation Notification
 * Shows when a case has been escalated to counselors
 */
interface EscalationNotificationProps {
  caseId: string;
  onDismiss?: () => void;
}

export function EscalationNotification({ caseId, onDismiss }: EscalationNotificationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 space-y-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <CheckCircle className="h-5 w-5 text-teal-500" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-medium text-teal-400">
            Kasus Telah Disampaikan
          </h4>
          <p className="text-xs text-white/70">
            Tim konselor profesional kami telah dihubungi dan akan segera menghubungi Anda.
            Keselamatan Anda adalah prioritas kami.
          </p>
          <div className="text-xs text-white/50">
            Case ID: {caseId.slice(0, 8)}...
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-white/50 hover:text-white/80 transition-colors"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Aika Avatar
 * Branded avatar for Aika messages
 */
export function AikaAvatar() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="relative flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg"
    >
      <Brain className="h-4 w-4 text-white" />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.2, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full bg-purple-400/30"
      />
    </motion.div>
  );
}

/**
 * Aika Powered Badge
 * Shows "Powered by Aika" branding
 */
export function AikaPoweredBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-white/60">
      <Brain className="h-3.5 w-3.5 text-purple-400" />
      <span>Powered by Aika 💙</span>
    </div>
  );
}

/**
 * Metadata Display
 * Shows detailed metadata from Aika response (for debugging/admin)
 */
interface MetadataDisplayProps {
  metadata: AikaMetadata;
}

export function MetadataDisplay({ metadata }: MetadataDisplayProps) {
  return (
    <motion.details
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-xs text-white/50 bg-white/5 rounded-lg border border-white/10 p-3 mt-2"
    >
      <summary className="cursor-pointer hover:text-white/70 transition-colors">
        Response Metadata
      </summary>
      <div className="mt-2 space-y-1 font-mono">
        <div>Session: {metadata.session_id}</div>
        <div>Role: {metadata.user_role}</div>
        <div>Intent: {metadata.intent}</div>
        <div>Agents: {metadata.agents_invoked.join(', ')}</div>
        <div>Actions: {metadata.actions_taken.join(', ')}</div>
        <div>Processing: {metadata.processing_time_ms}ms</div>
        {metadata.escalation_triggered && (
          <div className="text-teal-400">✓ Escalated (Case: {metadata.case_id})</div>
        )}
      </div>
    </motion.details>
  );
}
