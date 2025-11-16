/**
 * useAika Hook
 * 
 * React hook for interacting with the Aika Meta-Agent orchestrator.
 * This replaces direct agent calls with a unified LangGraph-orchestrated interface.
 * 
 * Features:
 * - Unified API endpoint (/api/v1/aika)
 * - Role-based routing (user=student/admin/counselor)
 * - Agent activity tracking
 * - Risk assessment monitoring
 * - Escalation notifications
 */

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export interface AikaMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AikaRiskAssessment {
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  confidence: number;
  risk_factors: string[];
}

export interface AikaMetadata {
  session_id: string;
  user_role: 'user' | 'admin' | 'counselor';
  intent: string;
  agents_invoked: string[];  // e.g., ["STA", "SCA"]
  actions_taken: string[];   // e.g., ["assess_risk", "provide_cbt_support"]
  processing_time_ms: number;
  risk_assessment?: AikaRiskAssessment;
  escalation_triggered: boolean;
  case_id?: string;  // If case was created
}

export interface AikaResponse {
  success: boolean;
  response: string;
  metadata: AikaMetadata;
  error?: string;
}

export interface AikaRequest {
  user_id: number;
  role: 'user' | 'admin' | 'counselor';
  message: string;
  conversation_history: AikaMessage[];
  preferred_model?: string;
}

interface UseAikaOptions {
  onAgentActivity?: (agents: string[]) => void;
  onRiskDetected?: (assessment: AikaRiskAssessment) => void;
  onEscalation?: (caseId: string) => void;
  showToasts?: boolean;
}

export function useAika(options: UseAikaOptions = {}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<AikaMetadata | null>(null);

  const {
    onAgentActivity,
    onRiskDetected,
    onEscalation,
    showToasts = true,
  } = options;

  /**
   * Send a message to Aika Meta-Agent
   */
  const sendMessage = useCallback(async (
    message: string,
    conversationHistory: AikaMessage[] = [],
    role: 'user' | 'admin' | 'counselor' = 'user',
    preferredModel?: string,
  ): Promise<AikaResponse | null> => {
    if (!session?.user?.id) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      if (showToasts) {
        toast.error('Anda harus login terlebih dahulu');
      }
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody: AikaRequest = {
        user_id: parseInt(session.user.id),
        role,
        message,
        conversation_history: conversationHistory.slice(-10), // Last 10 messages
        preferred_model: preferredModel,
      };

      const response = await fetch('/api/mental-health/aika', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: AikaResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Aika request failed');
      }

      // Store metadata
      setLastMetadata(data.metadata);

      // Handle agent activity
      if (onAgentActivity && data.metadata.agents_invoked.length > 0) {
        onAgentActivity(data.metadata.agents_invoked);
      }

      // Handle risk detection
      if (data.metadata.risk_assessment) {
        const { risk_level, risk_score } = data.metadata.risk_assessment;

        if (onRiskDetected) {
          onRiskDetected(data.metadata.risk_assessment);
        }

        // Show risk notifications
        if (showToasts) {
          if (risk_level === 'critical') {
            toast.error(
              '🚨 Tim profesional kami telah dihubungi untuk membantu Anda.',
              { duration: 6000 }
            );
          } else if (risk_level === 'high') {
            toast(
              '⚠️ Keselamatanmu penting. Pertimbangkan untuk menghubungi layanan dukungan.',
              { 
                duration: 5000,
                icon: '⚠️',
                style: {
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D'
                }
              }
            );
          }
        }
      }

      // Handle escalation
      if (data.metadata.escalation_triggered && data.metadata.case_id) {
        if (onEscalation) {
          onEscalation(data.metadata.case_id);
        }

        if (showToasts) {
          toast.success(
            '✅ Kasusmu telah disampaikan ke konselor profesional.',
            { duration: 5000 }
          );
        }
      }

      // Show multi-agent activity
      if (showToasts && data.metadata.agents_invoked.length > 1) {
        const agentNames = data.metadata.agents_invoked.join(', ');
        toast(
          `Aika berkonsultasi dengan: ${agentNames}`,
          { 
            duration: 3000,
            icon: '🤖',
          }
        );
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      if (showToasts) {
        toast.error(`Terjadi kesalahan: ${errorMessage}`);
      }

      console.error('Aika API Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session, onAgentActivity, onRiskDetected, onEscalation, showToasts]);

  /**
   * Get risk level color for UI
   */
  const getRiskLevelColor = useCallback((riskLevel: string): string => {
    switch (riskLevel) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'moderate':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'low':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  }, []);

  /**
   * Get agent display name
   */
  const getAgentDisplayName = useCallback((agentCode: string): string => {
    const agentNames: Record<string, string> = {
      STA: 'Safety Triage',
      TCA: 'Therapeutic Coach',
      CMA: 'Case Management',
      IA: 'Insights',
    };
    return agentNames[agentCode] || agentCode;
  }, []);

  return {
    sendMessage,
    loading,
    error,
    lastMetadata,
    getRiskLevelColor,
    getAgentDisplayName,
  };
}
