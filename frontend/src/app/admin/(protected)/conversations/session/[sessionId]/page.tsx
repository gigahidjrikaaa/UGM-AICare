"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  FiArrowLeft as ArrowLeft,
  FiMessageCircle as ChatIcon,
  FiClock as Clock,
  FiDownload as Download,
  FiFileText as FileText,
  FiSearch as Search,
  FiAlertTriangle as FlagIcon,
} from "@/icons";
import { apiCall, authenticatedFetch } from "@/utils/adminApi";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

// ============================================================================
// Types
// ============================================================================

interface SessionUser {
  id: number;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  last_login?: string | null;
  sentiment_score?: number | null;
}

interface ConversationDetail {
  id: number;
  user_id_hash: string;
  session_id: string;
  conversation_id: string;
  message: string;
  response: string;
  timestamp: string;
  sentiment_score?: number | null;
}

interface Analysis {
  message_pairs: number;
  total_user_chars: number;
  total_ai_chars: number;
  avg_user_message_length: number;
  avg_ai_message_length: number;
  top_keywords?: [string, number][];
  [key: string]: unknown;
}

interface SessionDetailResponse {
  session_id: string;
  user_id_hash: string;
  user?: SessionUser | null;
  conversation_count: number;
  first_message_time: string;
  last_message_time: string;
  total_duration_minutes: number;
  conversations: ConversationDetail[];
  analysis: Analysis;
}

interface FlagResponse {
  id: number;
  session_id: string;
  user_id?: number | null;
  reason?: string | null;
  status: string;
  flagged_by_admin_id?: number | null;
  created_at: string;
  updated_at: string;
  tags?: string[] | null;
  notes?: string | null;
}

// STA Risk Assessment types
interface ScreeningDimensionScore {
  score: number;
  evidence: string[];
  is_protective: boolean;
}

interface ScreeningExtraction {
  depression?: ScreeningDimensionScore | null;
  anxiety?: ScreeningDimensionScore | null;
  stress?: ScreeningDimensionScore | null;
  sleep?: ScreeningDimensionScore | null;
  social?: ScreeningDimensionScore | null;
  academic?: ScreeningDimensionScore | null;
  self_worth?: ScreeningDimensionScore | null;
  substance?: ScreeningDimensionScore | null;
  crisis?: ScreeningDimensionScore | null;
  protective_dimensions?: string[];
}

interface RiskAssessment {
  id: number;
  conversation_id?: string | null;
  session_id?: string | null;
  user_id?: number | null;
  overall_risk_level: string;
  risk_trend: string;
  conversation_summary: string;
  user_context?: {
    recent_stressors?: string[];
    coping_mechanisms?: string[];
    protective_factors?: string[];
    [key: string]: string[] | undefined;
  } | null;
  protective_factors?: string[] | null;
  concerns?: string[] | null;
  recommended_actions?: string[] | null;
  should_invoke_cma: boolean;
  reasoning: string;
  message_count: number;
  conversation_duration_seconds?: number | null;
  analysis_timestamp: string;
  raw_assessment?: {
    screening?: ScreeningExtraction | null;
    crisis_detected?: boolean;
    [key: string]: unknown;
  } | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

function humanDuration(mins: number) {
  if (!mins || mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', dot: 'bg-orange-500' },
  moderate: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-300', dot: 'bg-yellow-500' },
  low: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300', dot: 'bg-green-500' },
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  escalating: { label: 'Escalating', color: 'text-red-400' },
  'de-escalating': { label: 'De-escalating', color: 'text-green-400' },
  stable: { label: 'Stable', color: 'text-blue-300' },
  insufficient_data: { label: 'Insufficient Data', color: 'text-white/40' },
};

const DIMENSION_LABELS: Record<string, { label: string; instrument: string }> = {
  depression: { label: 'Depression', instrument: 'PHQ-9' },
  anxiety: { label: 'Anxiety', instrument: 'GAD-7' },
  stress: { label: 'Stress', instrument: 'DASS-21' },
  sleep: { label: 'Sleep', instrument: 'PSQI' },
  social: { label: 'Social', instrument: 'UCLA Loneliness' },
  academic: { label: 'Academic', instrument: 'Academic Pressure' },
  self_worth: { label: 'Self-Worth', instrument: 'Rosenberg SE' },
  substance: { label: 'Substance', instrument: 'AUDIT/DAST' },
  crisis: { label: 'Crisis', instrument: 'Self-Harm/SI' },
};

// ============================================================================
// Sub-components
// ============================================================================

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}> = ({ label, value, icon: Icon }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] text-white/50 uppercase tracking-wider">{label}</span>
      {Icon && <Icon className="h-4 w-4 text-[#FFCA40]" />}
    </div>
    <div className="text-xl font-semibold text-white">{value}</div>
  </div>
);

/** Renders a single screening dimension bar */
const DimensionBar: React.FC<{
  dimension: string;
  data: ScreeningDimensionScore;
}> = ({ dimension, data }) => {
  const meta = DIMENSION_LABELS[dimension] || { label: dimension, instrument: '' };
  const pct = Math.round(data.score * 100);
  const barColor = data.is_protective
    ? 'bg-green-500'
    : pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-orange-500' : pct >= 20 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/80 font-medium">{meta.label}</span>
          <span className="text-[10px] text-white/30">{meta.instrument}</span>
          {data.is_protective && (
            <span className="px-1.5 py-0.5 text-[10px] bg-green-500/15 border border-green-500/20 text-green-300 rounded">
              Protective
            </span>
          )}
          {dimension === 'crisis' && pct >= 50 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-500/15 border border-red-500/20 text-red-300 rounded animate-pulse">
              ALERT
            </span>
          )}
        </div>
        <span className={`text-sm font-bold ${pct >= 70 ? 'text-red-400' : pct >= 40 ? 'text-orange-400' : 'text-white/60'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {data.evidence.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {data.evidence.slice(0, 2).map((e, i) => (
            <span key={i} className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full italic">
              &quot;{e.length > 60 ? e.slice(0, 60) + '...' : e}&quot;
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Array.isArray(params?.sessionId) ? params.sessionId[0] : (params?.sessionId as string);

  // Session data
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // Flags
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagTags, setFlagTags] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [flagStatus, setFlagStatus] = useState<string>("open");
  const [sessionFlags, setSessionFlags] = useState<FlagResponse[]>([]);
  const activeFlag = useMemo(() => sessionFlags[0] || null, [sessionFlags]);
  const [editingFlagId, setEditingFlagId] = useState<number | null>(null);

  // STA Risk Assessment
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [triggeringAssessment, setTriggeringAssessment] = useState(false);

  // Load session data
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall<SessionDetailResponse>(`/api/v1/admin/conversation-session/${sessionId}`);
      setData(res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load session";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  // Load flags
  const loadFlags = useCallback(async () => {
    try {
      const allFlags = await apiCall<FlagResponse[]>(`/api/v1/admin/flags`);
      const filtered = allFlags
        .filter((f) => f.session_id === sessionId)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "open" ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      setSessionFlags(filtered);
      if (filtered[0]) {
        setFlagReason(filtered[0].reason || "");
        setFlagNotes(filtered[0].notes || "");
        setFlagStatus(filtered[0].status || "open");
        setFlagTags((filtered[0].tags || []).join(", "));
      }
    } catch (error) {
      console.warn("Failed to load flags", error);
    }
  }, [sessionId]);

  useEffect(() => { loadFlags(); }, [loadFlags]);

  // Load STA assessment for each conversation
  const loadAssessment = useCallback(async () => {
    if (!data || data.conversations.length === 0) return;
    setAssessmentLoading(true);
    try {
      // Try session-based assessment first
      const assessments = await apiCall<RiskAssessment[]>(
        `/api/v1/admin/conversation-assessments?session_id=${sessionId}`
      );
      if (assessments && assessments.length > 0) {
        // Pick the most recent
        const sorted = assessments.sort((a, b) =>
          new Date(b.analysis_timestamp).getTime() - new Date(a.analysis_timestamp).getTime()
        );
        setAssessment(sorted[0]);
      } else {
        // Try with the first conversation_id
        try {
          const convAssessment = await apiCall<RiskAssessment>(
            `/api/v1/admin/conversation-assessments/${data.conversations[0].conversation_id}`
          );
          setAssessment(convAssessment);
        } catch {
          // No assessment found — that's OK
          setAssessment(null);
        }
      }
    } catch {
      setAssessment(null);
    } finally {
      setAssessmentLoading(false);
    }
  }, [data, sessionId]);

  useEffect(() => { loadAssessment(); }, [loadAssessment]);

  // Trigger STA assessment
  const triggerAssessment = async () => {
    if (!data || data.conversations.length === 0) return;
    setTriggeringAssessment(true);
    try {
      const convId = data.conversations[data.conversations.length - 1].conversation_id;
      await apiCall(`/api/v1/admin/conversation-assessments/${convId}/trigger`, {
        method: 'POST',
      });
      toast.success('STA analysis triggered. Refreshing...');
      // Wait for processing then reload
      setTimeout(async () => {
        await loadAssessment();
        setTriggeringAssessment(false);
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger analysis';
      toast.error(msg);
      setTriggeringAssessment(false);
    }
  };

  const filteredConversations = useMemo(() => {
    if (!data) return [] as ConversationDetail[];
    if (!filter.trim()) return data.conversations;
    const q = filter.toLowerCase();
    return data.conversations.filter(c =>
      (c.message && c.message.toLowerCase().includes(q)) ||
      (c.response && c.response.toLowerCase().includes(q))
    );
  }, [data, filter]);

  const doExport = async (kind: "txt" | "csv") => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const path = kind === "csv" ? `export.csv` : `export`;
      const url = `${base}/api/v1/admin/conversation-session/${sessionId}/${path}`;
      const resp = await authenticatedFetch(url, { method: "GET" });
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `session_${sessionId}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export downloaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    }
  };

  const submitFlag = async () => {
    try {
      const tags = flagTags.split(",").map((t) => t.trim()).filter(Boolean);
      if (editingFlagId || activeFlag) {
        const id = editingFlagId || (activeFlag as FlagResponse).id;
        await apiCall(`/api/v1/admin/flags/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            status: flagStatus,
            reason: flagReason,
            tags,
            notes: flagNotes || undefined,
          }),
        });
      } else {
        await apiCall(`/api/v1/admin/conversations/session/${sessionId}/flag`, {
          method: "POST",
          body: JSON.stringify({
            reason: flagReason || undefined,
            tags: tags.length ? tags : undefined,
          }),
        });
      }
      setFlagOpen(false);
      setEditingFlagId(null);
      setFlagReason("");
      setFlagTags("");
      setFlagNotes("");
      toast.success(activeFlag ? 'Flag updated' : 'Session flagged');
      await loadFlags();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to flag session";
      toast.error(message);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ChatIcon className="h-6 w-6 text-[#FFCA40]" />
          <h1 className="text-xl font-semibold text-white">Loading session...</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <span className="text-red-400 text-sm">{error || "Failed to load session"}</span>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/admin/conversations")}>Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const shortId = data.session_id.slice(-8);
  const firstAgo = formatDistanceToNow(new Date(data.first_message_time), { addSuffix: true });
  const lastAgo = formatDistanceToNow(new Date(data.last_message_time), { addSuffix: true });
  const riskColors = assessment ? (RISK_COLORS[assessment.overall_risk_level] || RISK_COLORS.low) : null;
  const trendInfo = assessment ? (TREND_LABELS[assessment.risk_trend] || TREND_LABELS.insufficient_data) : null;
  const screening = assessment?.raw_assessment?.screening;

  return (
    <div className="space-y-5 max-w-400">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/conversations")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <ChatIcon className="h-6 w-6 text-[#FFCA40]" />
            <h1 className="text-xl font-bold text-white truncate">Session ...{shortId}</h1>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[11px] text-white/50 font-mono truncate max-w-50">
              {data.user_id_hash}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { setEditingFlagId(null); setFlagStatus("open"); setFlagReason(""); setFlagTags(""); setFlagNotes(""); setFlagOpen(true); }}>
              <FlagIcon className="h-4 w-4 mr-1" /> Flag
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("txt")}>
              <FileText className="h-4 w-4 mr-1" /> TXT
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("csv")}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
        {data.user?.email && (
          <div className="text-xs text-white/50 mt-2 ml-30 flex items-center gap-2">
            <span>User: <span className="font-mono">{data.user.email}</span></span>
            {data.user.role && <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">{data.user.role}</span>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Message Pairs" value={data.conversation_count} icon={ChatIcon} />
        <StatCard label="Duration" value={humanDuration(data.total_duration_minutes)} icon={Clock} />
        <StatCard label="First Message" value={firstAgo} icon={Clock} />
        <StatCard label="Last Message" value={lastAgo} icon={Clock} />
      </div>

      {/* Active Flag Banner */}
      {activeFlag && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <FlagIcon className="h-4 w-4 text-yellow-300" />
              <span className="font-medium text-yellow-200">Flagged</span>
              <span className="px-2 py-0.5 rounded text-[11px] border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                {activeFlag.status}
              </span>
              <span className="text-xs text-yellow-200/60">
                {formatDistanceToNow(new Date(activeFlag.updated_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(activeFlag.tags || []).slice(0, 3).map((t, i) => (
                <span key={`${t}-${i}`} className="px-1.5 py-0.5 rounded text-[10px] border border-yellow-400/15 bg-yellow-400/10 text-yellow-200">{t}</span>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                setEditingFlagId(activeFlag.id); setFlagStatus(activeFlag.status); setFlagReason(activeFlag.reason || ""); setFlagTags((activeFlag.tags || []).join(", ")); setFlagNotes(activeFlag.notes || ""); setFlagOpen(true);
              }}>
                Manage
              </Button>
            </div>
          </div>
          {activeFlag.reason && <p className="text-sm text-yellow-100/80 mt-2">{activeFlag.reason}</p>}
        </div>
      )}

      {/* STA Risk Assessment Section */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              STA Risk Assessment
            </h2>
            <p className="text-xs text-white/40 mt-0.5 ml-7">Safety Triage Agent analysis with psychologist-relevant insights</p>
          </div>
          <button
            onClick={triggerAssessment}
            disabled={triggeringAssessment || assessmentLoading}
            className="px-3 py-1.5 text-[11px] font-medium bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {triggeringAssessment ? (
              <>
                <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              'Run STA Analysis'
            )}
          </button>
        </div>

        <div className="p-6">
          {assessmentLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !assessment ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-sm text-white/50">No STA assessment available</p>
              <p className="text-xs text-white/30 mt-1">Click &quot;Run STA Analysis&quot; to generate a risk assessment</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Risk Overview Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Risk Level */}
                <div className={`${riskColors?.bg} border ${riskColors?.border} rounded-xl p-4`}>
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">Overall Risk</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${riskColors?.dot}`} />
                    <span className={`text-xl font-bold ${riskColors?.text}`}>
                      {assessment.overall_risk_level.toUpperCase()}
                    </span>
                  </div>
                  {assessment.should_invoke_cma && (
                    <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-medium bg-red-500/15 border border-red-500/20 text-red-300 rounded">
                      CMA Recommended
                    </span>
                  )}
                </div>

                {/* Risk Trend */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">Risk Trend</p>
                  <span className={`text-lg font-semibold ${trendInfo?.color}`}>
                    {trendInfo?.label}
                  </span>
                  <p className="text-[11px] text-white/30 mt-1">{assessment.message_count} messages analyzed</p>
                </div>

                {/* Crisis Detection */}
                <div className={`rounded-xl p-4 border ${
                  assessment.raw_assessment?.crisis_detected
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-white/5 border-white/10'
                }`}>
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">Crisis Status</p>
                  {assessment.raw_assessment?.crisis_detected ? (
                    <span className="text-lg font-bold text-red-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      Crisis Detected
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-green-300">No Crisis</span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">Conversation Summary</p>
                <p className="text-sm text-white/80 leading-relaxed">{assessment.conversation_summary}</p>
              </div>

              {/* Concerns + Protective Factors + Actions (3 columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Concerns */}
                <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                  <p className="text-[11px] text-red-300/80 uppercase tracking-wider mb-3 font-medium">Concerns</p>
                  {assessment.concerns && assessment.concerns.length > 0 ? (
                    <ul className="space-y-2">
                      {assessment.concerns.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/30">No concerns identified</p>
                  )}
                </div>

                {/* Protective Factors */}
                <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4">
                  <p className="text-[11px] text-green-300/80 uppercase tracking-wider mb-3 font-medium">Protective Factors</p>
                  {assessment.protective_factors && assessment.protective_factors.length > 0 ? (
                    <ul className="space-y-2">
                      {assessment.protective_factors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/30">No protective factors identified</p>
                  )}
                </div>

                {/* Recommended Actions */}
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
                  <p className="text-[11px] text-blue-300/80 uppercase tracking-wider mb-3 font-medium">Recommended Actions</p>
                  {assessment.recommended_actions && assessment.recommended_actions.length > 0 ? (
                    <ul className="space-y-2">
                      {assessment.recommended_actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="text-blue-400 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/30">No actions recommended</p>
                  )}
                </div>
              </div>

              {/* Mental Health Dimensions (9-bar chart) */}
              {screening && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-4 font-medium">Mental Health Screening Dimensions</p>
                  <div className="space-y-4">
                    {Object.entries(DIMENSION_LABELS).map(([key]) => {
                      const dimData = screening[key as keyof ScreeningExtraction] as ScreeningDimensionScore | undefined | null;
                      if (!dimData || typeof dimData !== 'object' || !('score' in dimData)) return null;
                      return <DimensionBar key={key} dimension={key} data={dimData} />;
                    })}
                  </div>
                </div>
              )}

              {/* User Context */}
              {assessment.user_context && Object.keys(assessment.user_context).length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-3 font-medium">User Context</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(assessment.user_context).map(([key, values]) => {
                      if (!values || values.length === 0) return null;
                      return (
                        <div key={key}>
                          <p className="text-xs text-white/60 font-medium mb-2 capitalize">{key.replace(/_/g, ' ')}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {values.map((v, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[11px] text-white/60">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reasoning (collapsible) */}
              <details className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 text-[11px] text-white/50 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors font-medium">
                  STA Reasoning (chain-of-thought)
                </summary>
                <div className="px-4 py-3 border-t border-white/5">
                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{assessment.reasoning}</p>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Insights + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-3">Conversation Insights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Avg User Len" value={data.analysis.avg_user_message_length.toFixed(1)} />
            <StatCard label="Avg AI Len" value={data.analysis.avg_ai_message_length.toFixed(1)} />
            <StatCard label="User Chars" value={data.analysis.total_user_chars.toLocaleString()} />
            <StatCard label="AI Chars" value={data.analysis.total_ai_chars.toLocaleString()} />
          </div>
          {data.analysis.top_keywords && data.analysis.top_keywords.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-white/50 mb-2">Top Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {data.analysis.top_keywords.map(([word, count], i) => (
                  <span key={`${word}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[11px] text-white/60">
                    <span className="font-medium">{word}</span>
                    <span className="text-white/30">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Search</h2>
            <div className="relative">
              <Search className="h-4 w-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
              />
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              {filteredConversations.length} of {data.conversations.length} turns
            </p>
          </div>

          {/* Flags History */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Flags ({sessionFlags.length})</h2>
              <Button variant="outline" size="sm" onClick={() => { setEditingFlagId(null); setFlagStatus("open"); setFlagReason(""); setFlagTags(""); setFlagNotes(""); setFlagOpen(true); }}>
                New
              </Button>
            </div>
            {sessionFlags.length === 0 ? (
              <p className="text-xs text-white/30">No flags for this session</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {sessionFlags.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          f.status === 'open' ? 'bg-yellow-500/10 text-yellow-200 border-yellow-400/20' :
                          f.status === 'resolved' ? 'bg-green-500/10 text-green-200 border-green-400/20' :
                          'bg-white/5 text-white/40 border-white/10'
                        }`}>{f.status}</span>
                        <span className="text-white/30">{formatDistanceToNow(new Date(f.updated_at), { addSuffix: true })}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingFlagId(f.id); setFlagStatus(f.status); setFlagReason(f.reason || ''); setFlagTags((f.tags || []).join(', ')); setFlagNotes(f.notes || ''); setFlagOpen(true);
                      }}>Edit</Button>
                    </div>
                    {f.reason && <p className="mt-1.5 text-xs text-white/60">{f.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Timeline */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Chat Timeline</h2>
          <span className="text-[11px] text-white/30">Newest at bottom</span>
        </div>
        <div className="p-5 max-h-[65vh] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-white/40 py-8">No messages match your filter.</div>
          ) : (
            <div className="space-y-5">
              {filteredConversations.map((c) => (
                <div key={c.id} className="space-y-3">
                  {c.message && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] lg:max-w-3xl">
                        <div className="flex items-center justify-end gap-2 text-[10px] text-white/30 mb-1">
                          <span>User</span>
                          <span>{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-blue-600/80 text-white rounded-br-none">
                          <p className="whitespace-pre-wrap wrap-break-word text-sm">{c.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {c.response && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] lg:max-w-3xl">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 mb-1">
                          <span>AI</span>
                          <span>{new Date(c.timestamp).toLocaleString()}</span>
                          {typeof c.sentiment_score === "number" && (
                            <span className={`px-1 py-0.5 rounded text-[10px] border ${
                              c.sentiment_score >= 0.2
                                ? "text-green-300 bg-green-600/15 border-green-400/20"
                                : c.sentiment_score <= -0.2
                                ? "text-red-300 bg-red-600/15 border-red-400/20"
                                : "text-white/40 bg-white/5 border-white/10"
                            }`}>
                              {c.sentiment_score >= 0.2 ? "positive" : c.sentiment_score <= -0.2 ? "negative" : "neutral"}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white/10 text-white/90 rounded-bl-none border border-white/10">
                          <p className="whitespace-pre-wrap wrap-break-word text-sm">{c.response}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flag Side Panel */}
      {flagOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFlagOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-105 bg-[#000c24] border-l border-white/10 shadow-xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FlagIcon className="h-4 w-4 text-yellow-400" />
                {editingFlagId ? 'Edit Flag' : 'New Flag'} ...{shortId}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setFlagOpen(false)}>Close</Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="flag-status" className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  id="flag-status"
                  value={flagStatus}
                  onChange={(e) => setFlagStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
                >
                  <option value="open" className="bg-[#001a47]">Open</option>
                  <option value="resolved" className="bg-[#001a47]">Resolved</option>
                  <option value="ignored" className="bg-[#001a47]">Ignored</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 resize-none"
                  placeholder="Why is this session flagged?"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1.5">Tags</label>
                <input
                  value={flagTags}
                  onChange={(e) => setFlagTags(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
                  placeholder="crisis, escalation, urgent..."
                />
                {flagTags && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {flagTags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                      <span key={`${t}-${i}`} className="px-2 py-0.5 rounded text-[10px] border border-white/10 bg-white/5 text-white/50">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 resize-none"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setFlagOpen(false)}>Cancel</Button>
              <Button onClick={submitFlag}>{editingFlagId || activeFlag ? 'Save Changes' : 'Create Flag'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
