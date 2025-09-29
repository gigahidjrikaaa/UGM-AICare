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

// Card helper
const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent?: string;
}> = ({ label, value, icon: Icon, accent = "#FFCA40" }) => (
  <div className="bg-white/5 dark:bg-gray-800/60 backdrop-blur-md border border-white/10 dark:border-gray-700 rounded-xl p-3 sm:p-4">
    <div className="flex items-center justify-between pb-1 min-w-0">
      <span className="text-[11px] sm:text-xs text-gray-400 truncate">{label}</span>
      {Icon ? <Icon className="h-4 w-4 flex-shrink-0" style={{ color: accent }} /> : null}
    </div>
    <div className="text-xl sm:text-2xl font-semibold text-white truncate">{value}</div>
  </div>
);

function humanDuration(mins: number) {
  if (!mins || mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = Array.isArray(params?.sessionId) ? params.sessionId[0] : (params?.sessionId as string);
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagTags, setFlagTags] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [flagStatus, setFlagStatus] = useState<string>("open");
  const [sessionFlags, setSessionFlags] = useState<FlagResponse[]>([]);
  const activeFlag = useMemo(() => sessionFlags[0] || null, [sessionFlags]);
  const [editingFlagId, setEditingFlagId] = useState<number | null>(null);

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

  const loadFlags = useCallback(async () => {
    try {
      // Fetch all flags and filter by session
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      alert(message);
    }
  };

  const submitFlag = async () => {
    try {
      const tags = flagTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (editingFlagId || activeFlag) {
        // Update existing flag
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
        // Create new flag
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
      await loadFlags();
      alert("Session flagged");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to flag session";
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <ChatIcon className="h-7 w-7 text-[#FFCA40]" />
          <h1 className="text-2xl font-semibold">Loading session…</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 text-red-400 border border-red-400/30 bg-red-500/10 px-4 py-2 rounded-lg">
          <span>{error || "Failed to load session"}</span>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/admin/conversations")}>Back</Button>
        </div>
      </div>
    );
  }

  const shortId = data.session_id.slice(-8);
  const firstAgo = formatDistanceToNow(new Date(data.first_message_time), { addSuffix: true });
  const lastAgo = formatDistanceToNow(new Date(data.last_message_time), { addSuffix: true });

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl 2xl:max-w-[100rem]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/conversations")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <ChatIcon className="h-7 w-7 text-[#FFCA40]" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">Session …{shortId}</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] sm:text-xs text-gray-200 max-w-full sm:max-w-none truncate">
              # {data.user_id_hash}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingFlagId(null);
                setFlagStatus("open");
                setFlagReason("");
                setFlagTags("");
                setFlagNotes("");
                setFlagOpen(true);
              }}
            >
              <FlagIcon className="h-4 w-4 mr-1" /> Flag
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("txt")}>
              <FileText className="h-4 w-4 mr-1" /> Transcript
            </Button>
            <Button variant="outline" size="sm" onClick={() => doExport("csv")}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
        {data.user?.email && (
          <div className="text-xs sm:text-sm text-gray-300 flex flex-wrap items-center gap-2 min-w-0">
            <span className="shrink-0">User:</span>
            <span className="font-mono truncate max-w-[70vw] sm:max-w-xs">{data.user.email}</span>
            {data.user.role ? <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] sm:text-xs">{data.user.role}</span> : null}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Messages (pairs)" value={data.conversation_count} icon={ChatIcon} />
        <StatCard label="Duration" value={humanDuration(data.total_duration_minutes)} icon={Clock} />
        <StatCard label="First Message" value={firstAgo} icon={Clock} />
        <StatCard label="Last Message" value={lastAgo} icon={Clock} />
      </div>

      {/* Analysis + Filters */}
      {activeFlag && (
        <div className="mb-6 p-4 border rounded-xl bg-yellow-500/10 border-yellow-400/30 text-yellow-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <FlagIcon className="h-4 w-4 text-yellow-300" />
              <span className="font-medium">This session is flagged</span>
              <span className="px-2 py-0.5 rounded text-xs border border-yellow-400/30 bg-yellow-400/10">
                {activeFlag.status}
              </span>
              <span className="opacity-80 text-xs">
                Updated {formatDistanceToNow(new Date(activeFlag.updated_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(activeFlag.tags || []).slice(0, 4).map((t, i) => (
                <span key={`${t}-${i}`} className="px-2 py-0.5 rounded text-xs border border-yellow-400/20 bg-yellow-400/10 text-yellow-200">{t}</span>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeFlag) {
                    setEditingFlagId(activeFlag.id);
                    setFlagStatus(activeFlag.status);
                    setFlagReason(activeFlag.reason || "");
                    setFlagTags((activeFlag.tags || []).join(", "));
                    setFlagNotes(activeFlag.notes || "");
                  } else {
                    setEditingFlagId(null);
                    setFlagStatus("open");
                    setFlagReason("");
                    setFlagTags("");
                    setFlagNotes("");
                  }
                  setFlagOpen(true);
                }}
              >
                Manage Flag
              </Button>
            </div>
          </div>
          {activeFlag.reason && (
            <div className="mt-2 text-sm text-yellow-100/90">Reason: {activeFlag.reason}</div>
          )}
          {activeFlag.notes && (
            <div className="mt-1 text-xs text-yellow-100/80">Notes: {activeFlag.notes}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="lg:col-span-2 bg-white/5 dark:bg-gray-800/60 border border-white/10 dark:border-gray-700 rounded-xl p-4 sm:p-5">
          <h2 className="text-lg font-semibold mb-3">Conversation Insights</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard label="Avg User Len" value={data.analysis.avg_user_message_length.toFixed(1)} />
            <StatCard label="Avg AI Len" value={data.analysis.avg_ai_message_length.toFixed(1)} />
            <StatCard label="Total User Chars" value={data.analysis.total_user_chars} />
            <StatCard label="Total AI Chars" value={data.analysis.total_ai_chars} />
          </div>
          {data.analysis.top_keywords && data.analysis.top_keywords.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-300 mb-2">Top Keywords</div>
              <div className="flex flex-wrap gap-2">
                {data.analysis.top_keywords.map(([word, count], i) => (
                  <span key={`${word}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-200">
                    <span className="font-medium">{word}</span>
                    <span className="opacity-70">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <div className="bg-white/5 dark:bg-gray-800/60 border border-white/10 dark:border-gray-700 rounded-xl p-4 sm:p-5">
            <h2 className="text-lg font-semibold mb-3">Quick Filters</h2>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search in this session…"
                className="w-full pl-10 pr-3 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent"
              />
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Showing {filteredConversations.length} of {data.conversations.length} turns
            </div>
          </div>
          {/* Flags History */}
          <div className="bg-white/5 dark:bg-gray-800/60 border border-white/10 dark:border-gray-700 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Flags History</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingFlagId(null);
                  setFlagStatus("open");
                  setFlagReason("");
                  setFlagTags("");
                  setFlagNotes("");
                  setFlagOpen(true);
                }}
              >
                New Flag
              </Button>
            </div>
            {sessionFlags.length === 0 ? (
              <div className="text-sm text-gray-400">No flags for this session.</div>
            ) : (
              <div className="space-y-3 max-h-60 sm:max-h-80 overflow-auto pr-1">
                {sessionFlags.map((f) => (
                  <div key={f.id} className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded border ${
                          f.status === 'open' ? 'bg-yellow-500/15 text-yellow-200 border-yellow-400/30' :
                          f.status === 'resolved' ? 'bg-green-500/15 text-green-200 border-green-400/30' :
                          'bg-gray-500/15 text-gray-200 border-gray-400/30'
                        }`}>{f.status}</span>
                        <span className="text-gray-400">{formatDistanceToNow(new Date(f.updated_at), { addSuffix: true })}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingFlagId(f.id);
                          setFlagStatus(f.status);
                          setFlagReason(f.reason || '');
                          setFlagTags((f.tags || []).join(', '));
                          setFlagNotes(f.notes || '');
                          setFlagOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    {f.reason && (
                      <div className="mt-2 text-sm text-gray-200">{f.reason}</div>
                    )}
                    {(f.tags && f.tags.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {f.tags.map((t, i) => (
                          <span key={`${t}-${i}`} className="px-1.5 py-0.5 rounded text-[10px] border border-white/15 bg-white/5 text-gray-300">{t}</span>
                        ))}
                      </div>
                    )}
                    {f.notes && (
                      <div className="mt-2 text-xs text-gray-400">{f.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/5 dark:bg-gray-800/60 border border-white/10 dark:border-gray-700 rounded-xl">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat Timeline</h2>
          <div className="text-xs text-gray-400">Newest at bottom</div>
        </div>
        <div className="p-3 sm:p-5 max-h-[70vh] xl:max-h-[65vh] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-gray-400">No messages match your filter.</div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {filteredConversations.map((c) => (
                <div key={c.id} className="space-y-3">
                  {c.message && (
                    <div className="flex justify-end">
                      <div className="max-w-[88vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
                        <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 mb-1">
                          <span>User</span>
                          <span>•</span>
                          <span>{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-blue-600/90 text-white rounded-br-none shadow">
                          <p className="whitespace-pre-wrap break-words">{c.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {c.response && (
                    <div className="flex justify-start">
                      <div className="max-w-[88vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-1">
                          <span>AI</span>
                          <span>•</span>
                          <span>{new Date(c.timestamp).toLocaleString()}</span>
                          {typeof c.sentiment_score === "number" && (
                            <span
                              className={`${
                                c.sentiment_score >= 0.2
                                  ? "text-green-300 bg-green-600/20 border-green-400/30"
                                  : c.sentiment_score <= -0.2
                                  ? "text-red-300 bg-red-600/20 border-red-400/30"
                                  : "text-gray-300 bg-gray-600/20 border-gray-400/30"
                              } px-1.5 py-0.5 rounded border`}
                              title={`Sentiment score ${c.sentiment_score.toFixed(2)}`}
                            >
                              {c.sentiment_score >= 0.2
                                ? "positive"
                                : c.sentiment_score <= -0.2
                                ? "negative"
                                : "neutral"}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-white/95 text-gray-900 rounded-bl-none shadow border border-gray-200/70">
                          <p className="whitespace-pre-wrap break-words">{c.response}</p>
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

      {flagOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFlagOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlagIcon className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Manage Flag …{shortId}</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFlagOpen(false)}>Close</Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="flag-status" className="block text-sm font-medium mb-1">Status</label>
                <select
                  id="flag-status"
                  value={flagStatus}
                  onChange={(e) => setFlagStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="ignored">Ignored</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                  placeholder="Describe why this session is being flagged (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <input
                  value={flagTags}
                  onChange={(e) => setFlagTags(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                  placeholder="Comma-separated tags (e.g., crisis, escalation)"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {flagTags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                    <span key={`${t}-${i}`} className="px-2 py-0.5 rounded text-xs border border-white/20 bg-white/10 text-gray-200">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800"
                  placeholder="Internal notes (optional)"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setFlagOpen(false)}>Cancel</Button>
              <Button onClick={submitFlag}>{activeFlag ? 'Save Changes' : 'Create Flag'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
