'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FolderOpenIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { SDAGraphRequest, SDAGraphResponse } from '@/services/langGraphApi';
import { CaseCreationForm } from './components/CaseCreationForm';
import { SummaryCards } from './components/SummaryCards';
import { PriorityQueue } from './components/PriorityQueue';
import { useSSE } from '@/hooks/useSSE';
import type { SSEEvent } from '@/hooks/useSSE';

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

  // Handle SSE events for real-time case updates
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    console.log('[ServiceDesk] SSE Event:', event);

    switch (event.type) {
      case 'case_created':
      case 'case_updated': {
        const caseData = event.data as CaseRecord;
        
        // Show toast for new high/critical severity cases
        if (event.type === 'case_created' && (caseData.severity === 'critical' || caseData.severity === 'high')) {
          toast.success(`🚨 New ${caseData.severity.toUpperCase()} case created: ${caseData.case_id}`, {
            duration: 5000,
            icon: '🚨',
          });
        }

        // Update or add case to recent cases list
        setRecentCases(prev => {
          const existingIndex = prev.findIndex(c => c.case_id === caseData.case_id);
          
          if (existingIndex >= 0) {
            // Update existing case
            const updated = [...prev];
            updated[existingIndex] = caseData;
            return updated;
          } else {
            // Add new case to top of list
            return [caseData, ...prev].slice(0, 10);
          }
        });
        break;
      }

      case 'sla_breach': {
        const caseData = event.data as CaseRecord;
        toast.error(`⚠️ SLA BREACH: Case ${caseData.case_id}`, {
          duration: 8000,
        });
        break;
      }

      case 'connected':
        console.log('[ServiceDesk] SSE connected');
        break;

      case 'ping':
        // Heartbeat - no action needed
        break;

      default:
        console.log('[ServiceDesk] Unhandled event type:', event.type);
    }
  }, []);

  // Initialize SSE connection for real-time updates
  const { isConnected } = useSSE({
    url: '/api/v1/admin/sse/events',
    onEvent: handleSSEEvent,
    eventTypes: ['connected', 'case_created', 'case_updated', 'sla_breach', 'ping'],
    autoReconnect: true,
    debug: process.env.NODE_ENV === 'development',
  });

  const handleCreateCase = useCallback(async (request: SDAGraphRequest) => {
    setLoading(true);
    try {
      // Import dynamically to avoid SSR issues
      const { langGraphApi } = await import('@/services/langGraphApi');
      const result: SDAGraphResponse = await langGraphApi.executeSDA(request);

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

      return result;
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
          <h1 className="text-3xl font-bold text-white mb-2">Service Desk Dashboard</h1>
          <p className="text-white/60 text-sm">
            Create and manage cases through the Service Desk Agent (SDA) with automatic SLA tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time connection status */}
          <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl ${
            isConnected 
              ? 'bg-emerald-500/20 border-emerald-500/30' 
              : 'bg-orange-500/20 border-orange-500/30'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'
            }`}></div>
            <span className={`text-sm font-medium ${
              isConnected ? 'text-emerald-300' : 'text-orange-300'
            }`}>
              {isConnected ? 'Live Updates Active' : 'Reconnecting...'}
            </span>
          </div>

          {/* SDA Graph status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-300">SDA Graph Active</span>
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
                Create Case via SDA Graph
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Cases created through SDA include automatic SLA calculation and counselor assignment
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
            <h3 className="text-sm font-medium text-blue-300">About Service Desk Agent (SDA)</h3>
            <div className="mt-2 text-sm text-white/60 space-y-1">
              <p>• <strong>Automatic SLA Calculation:</strong> Critical cases = 1 hour, High = 4 hours</p>
              <p>• <strong>Auto-Assignment:</strong> Cases are automatically assigned to available counselors</p>
              <p>• <strong>Escalation Tracking:</strong> SDA monitors SLA breaches and triggers alerts</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
