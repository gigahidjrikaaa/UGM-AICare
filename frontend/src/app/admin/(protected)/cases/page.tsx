/**
 * Admin Cases Management Page
 * Comprehensive case management with filtering, sorting, pagination, and workflows
 * Enhanced with glassmorphism design and improved information architecture
 */

'use client';

import { useEffect, useState } from 'react';
import { listCases } from '@/services/adminCaseApi';
import type { CaseListResponse, CaseFilters } from '@/types/admin/cases';
import CaseListTable from '@/components/admin/cases/CaseListTable';
import CaseDetailModal from '@/components/admin/cases/CaseDetailModal';
import CaseStatusWorkflow from '@/components/admin/cases/CaseStatusWorkflow';
import CaseAssignment from '@/components/admin/cases/CaseAssignment';
import toast from 'react-hot-toast';
import { 
  FiAlertCircle, FiClock, FiUsers, FiCheckCircle, 
  FiAlertTriangle, FiActivity, FiInfo 
} from 'react-icons/fi';

export default function CasesPage() {
  const [response, setResponse] = useState<CaseListResponse>({
    cases: [],
    total: 0,
    page: 1,
    page_size: 20,
    has_next: false,
    has_prev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CaseFilters>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listCases(filters);
        setResponse(data);
      } catch (err) {
        console.error('Failed to fetch cases:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cases');
        toast.error('Failed to load cases');
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [filters]);

  const handleCaseClick = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowDetailModal(true);
  };

  const handleStatusUpdate = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowDetailModal(false);
    setShowStatusModal(true);
  };

  const handleAssign = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowDetailModal(false);
    setShowAssignmentModal(true);
  };

  const handleSuccess = () => {
    // Trigger refetch by updating a timestamp or forcing filters update
    setFilters({ ...filters });
  };

  const selectedCase = response.cases.find((c) => c.id === selectedCaseId);

  // Calculate statistics
  const stats = {
    total: response.total,
    critical: response.cases.filter(c => c.severity === 'critical').length,
    high: response.cases.filter(c => c.severity === 'high').length,
    unassigned: response.cases.filter(c => !c.assigned_to).length,
    slaBreached: response.cases.filter(c => c.sla_status === 'breached').length,
    newCases: response.cases.filter(c => c.status === 'new').length,
    resolved: response.cases.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header with Glassmorphism */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Case Management</h1>
            <p className="text-white/70">
              Monitor and manage mental health cases with real-time SLA tracking
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFCA40]/20 border border-[#FFCA40]/30 rounded-lg">
              <FiActivity className="text-[#FFCA40]" size={20} />
              <div>
                <p className="text-xs text-white/60">Total Active Cases</p>
                <p className="text-xl font-bold text-white">{response.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {/* Critical Cases */}
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertCircle className="text-red-400" size={18} />
              <span className="text-xs text-red-300 font-semibold uppercase">Critical</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.critical}</p>
            <p className="text-xs text-white/50 mt-1">Immediate action required</p>
          </div>

          {/* High Priority */}
          <div className="bg-orange-500/10 backdrop-blur-sm border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle className="text-orange-400" size={18} />
              <span className="text-xs text-orange-300 font-semibold uppercase">High</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.high}</p>
            <p className="text-xs text-white/50 mt-1">High priority cases</p>
          </div>

          {/* New Cases */}
          <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiInfo className="text-blue-400" size={18} />
              <span className="text-xs text-blue-300 font-semibold uppercase">New</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.newCases}</p>
            <p className="text-xs text-white/50 mt-1">Awaiting review</p>
          </div>

          {/* Resolved Cases */}
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiCheckCircle className="text-green-400" size={18} />
              <span className="text-xs text-green-300 font-semibold uppercase">Resolved</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.resolved}</p>
            <p className="text-xs text-white/50 mt-1">Successfully handled</p>
          </div>

          {/* Unassigned Cases */}
          <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiUsers className="text-purple-400" size={18} />
              <span className="text-xs text-purple-300 font-semibold uppercase">Unassigned</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.unassigned}</p>
            <p className="text-xs text-white/50 mt-1">Need assignment</p>
          </div>

          {/* SLA Breached */}
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="text-red-400" size={18} />
              <span className="text-xs text-red-300 font-semibold uppercase">SLA Breach</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.slaBreached}</p>
            <p className="text-xs text-white/50 mt-1">Response time exceeded</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FiInfo className="text-blue-400 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">Case Management Features:</h3>
              <ul className="text-sm text-white/80 space-y-1.5">
                <li>• Real-time case tracking with automatic severity classification</li>
                <li>• SLA monitoring with breach alerts and color-coded indicators</li>
                <li>• Case assignment workflow for counselors and admins</li>
                <li>• Advanced filtering by status, severity, assignment, and SLA</li>
                <li>• Integration with Safety Triage Agent (STA) risk assessments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Cases Table */}
      <CaseListTable
        cases={response.cases}
        total={response.total}
        page={response.page}
        pageSize={response.page_size}
        hasNext={response.has_next}
        hasPrev={response.has_prev}
        filters={filters}
        onFilterChange={setFilters}
        onCaseClick={handleCaseClick}
        loading={loading}
      />

      {/* Modals */}
      {selectedCaseId && (
        <>
          <CaseDetailModal
            caseId={selectedCaseId}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedCaseId(null);
            }}
            onStatusUpdate={handleStatusUpdate}
            onAssign={handleAssign}
          />

          <CaseStatusWorkflow
            caseId={selectedCaseId}
            currentStatus={selectedCase?.status || 'new'}
            isOpen={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedCaseId(null);
            }}
            onSuccess={handleSuccess}
          />

          <CaseAssignment
            caseId={selectedCaseId}
            currentAssignee={selectedCase?.assigned_to || null}
            isOpen={showAssignmentModal}
            onClose={() => {
              setShowAssignmentModal(false);
              setSelectedCaseId(null);
            }}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </div>
  );
}
