'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FolderOpenIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CMAGraphRequest, CMAGraphResponse } from '@/services/langGraphApi';
import { CaseCreationForm } from './components/CaseCreationForm';
import { SummaryCards } from './components/SummaryCards';
import { PriorityQueue } from './components/PriorityQueue';
import { useAdminSSE, useSSEEventHandler } from '@/contexts/AdminSSEContext';

interface CaseRecord {
  case_id: string;
  severity: string;
  status: string;
  sla_breach_at: string;
  assigned_to?: number;
  created_at: string;
}

export default function ServiceDeskClient() {
  const [loading, setLoading] = useState(false);
  const [recentCases, setRecentCases] = useState<CaseRecord[]>([]);

  // Get SSE connection status from centralized context
  const { isConnected } = useAdminSSE();

  // Handle case_created events
  useSSEEventHandler('case_created', useCallback((data: CaseRecord) => {
    // Show toast for new high/critical severity cases
    if (data.severity === 'critical' || data.severity === 'high') {
      toast.success(`🚨 New ${data.severity.toUpperCase()} case created: ${data.case_id}`, {
        duration: 5000,
        icon: '🚨',
      });
    }

    // Add case to recent cases list
    setRecentCases(prev => {
      const existingIndex = prev.findIndex(c => c.case_id === data.case_id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated;
      } else {
        return [data, ...prev].slice(0, 10);
      }
    });
  }, []));

  // Handle case_updated events
  useSSEEventHandler('case_updated', useCallback((data: CaseRecord) => {
    // Update case in recent cases list
    setRecentCases(prev => {
      const existingIndex = prev.findIndex(c => c.case_id === data.case_id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated;
      } else {
        return [data, ...prev].slice(0, 10);
      }
    });
  }, []));

  // Handle sla_breach events
  useSSEEventHandler('sla_breach', useCallback((data: CaseRecord) => {
    toast.error(`⚠️ SLA BREACH: Case ${data.case_id}`, {
      duration: 8000,
    });
  }, []));

  const handleCreateCase = useCallback<(request: CMAGraphRequest) => Promise<void>>(async (request) => {
    setLoading(true);
    try {
      // Import dynamically to avoid SSR issues
      const { langGraphApi } = await import('@/services/langGraphApi');
      const result: CMAGraphResponse = await langGraphApi.executeCMA(request);

      if (!result.success) {
        throw new Error(result.errors.join(', ') || 'Failed to create case');
      }

      toast.success(`✅ Case created successfully! ID: ${result.case_id}`);

      // Add to recent cases
      setRecentCases(prev => [{
        case_id: result.case_id,
        severity: request.severity,
        sla_breach_at: result.sla_breach_at,
        assigned_to: result.assigned_counselor_id,
        created_at: new Date().toISOString(),
        status: 'new',
      }, ...prev].slice(0, 10));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Failed to create case: ${errorMessage}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Service Desk Dashboard</h1>
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-full">
              REAL-TIME TRIAGE
            </span>
          </div>
          <p className="text-white/60 text-sm mb-2">
            Create and manage cases through the Case Management Agent (CMA) with automatic SLA tracking
          </p>
          <a
            href="/admin/cases"
            className="text-[#FFCA40] hover:text-[#FFCA40]/80 text-sm flex items-center gap-1 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Need detailed case management? View all cases →
          </a>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time connection status */}
          <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl ${isConnected
              ? 'bg-emerald-500/20 border-emerald-500/30'
              : 'bg-orange-500/20 border-orange-500/30'
            }`}>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'
              }`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-300' : 'text-orange-300'
              }`}>
              {isConnected ? 'Live Updates Active' : 'Reconnecting...'}
            </span>
          </div>

          {/* CMA Graph status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-300">CMA Graph Active</span>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SummaryCards cases={recentCases} />
      </motion.div>

      {/* Case Creation Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FolderOpenIcon className="w-6 h-6 text-[#FFCA40]" />
                Create Case via CMA Graph
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Cases created through CMA include automatic SLA calculation and counselor assignment
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <CaseCreationForm onSubmit={handleCreateCase} loading={loading} />
        </div>
      </motion.div>

      {/* Priority Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <ClockIcon className="w-6 h-6 text-blue-400" />
                Priority Queue
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Recently created cases sorted by SLA urgency
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <PriorityQueue cases={recentCases} />
        </div>
      </motion.div>

      {/* Info Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-300">About Case Management Agent (CMA)</h3>
            <div className="mt-2 text-sm text-white/60 space-y-1">
              <p>• <strong>Automatic SLA Calculation:</strong> Critical cases = 1 hour, High = 4 hours</p>
              <p>• <strong>Auto-Assignment:</strong> Cases are automatically assigned to available counselors</p>
              <p>• <strong>Escalation Tracking:</strong> CMA monitors SLA breaches and triggers alerts</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

