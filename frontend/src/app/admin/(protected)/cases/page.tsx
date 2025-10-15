/**
 * Admin Cases Management Page
 * Comprehensive case management with filtering, sorting, pagination, and workflows
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Case Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage cases with SLA tracking
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Total Cases:{' '}
            <span className="font-semibold">{response.total}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      )}

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
