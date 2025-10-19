/**
 * CaseAssignment Component
 * Handles case assignment and reassignment
 */

'use client';

import { useState } from 'react';
import { assignCase } from '@/services/adminCaseApi';
import toast from 'react-hot-toast';

interface CaseAssignmentProps {
  caseId: string;
  currentAssignee: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CaseAssignment({
  caseId,
  currentAssignee,
  isOpen,
  onClose,
  onSuccess,
}: CaseAssignmentProps) {
  const [assignee, setAssignee] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Predefined counselors (in real app, fetch from API)
  const counselors = [
    'counselor1',
    'counselor2',
    'counselor3',
    'dr.smith',
    'dr.jones',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignee.trim()) {
      toast.error('Please select or enter a counselor');
      return;
    }

    setSubmitting(true);
    try {
      await assignCase(caseId, {
        assigned_to: assignee,
        reason: reason.trim() || undefined,
      });
      toast.success(`Case ${currentAssignee ? 'reassigned' : 'assigned'} to ${assignee}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign case:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign case');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {currentAssignee ? 'Reassign Case' : 'Assign Case'}
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {currentAssignee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Assignee
              </label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-100">
                {currentAssignee}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="case-assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign To <span className="text-red-500">*</span>
            </label>
            <select
              id="case-assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select counselor...</option>
              {counselors.map((counselor) => (
                <option key={counselor} value={counselor}>
                  {counselor}
                </option>
              ))}
              <option value="custom">Custom (type below)</option>
            </select>
          </div>

          {assignee === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Counselor ID/Username
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Enter counselor ID or username"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          )}

          {currentAssignee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Reassignment {currentAssignee && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the case is being reassigned..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required={!!currentAssignee}
              />
            </div>
          )}

          {!currentAssignee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Note (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add any notes about this assignment..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          {/* Info Box */}
          <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              <strong>Note:</strong> Assignment history is tracked for audit purposes.
              {currentAssignee && ' Previous assignee will be recorded.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !assignee.trim()}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : currentAssignee ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
