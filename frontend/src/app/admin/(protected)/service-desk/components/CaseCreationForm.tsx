import { useState } from 'react';
import { CMAGraphRequest } from '@/services/langGraphApi';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface CaseCreationFormProps {
  onSubmit: (request: CMAGraphRequest) => Promise<void>;
  loading: boolean;
}

export function CaseCreationForm({ onSubmit, loading }: CaseCreationFormProps) {
  const [formData, setFormData] = useState<{
    user_id: string;
    session_id: string;
    user_hash: string;
    severity: 'critical' | 'high' | 'moderate' | 'low';
    message: string;
    intent: string;
    risk_level: number;
  }>({
    user_id: '',
    session_id: '',
    user_hash: '',
    severity: 'high',
    message: '',
    intent: 'support_request',
    risk_level: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const request: CMAGraphRequest = {
      user_id: parseInt(formData.user_id),
      session_id: formData.session_id,
      user_hash: formData.user_hash,
      severity: formData.severity,
      message: formData.message,
      intent: formData.intent,
      risk_level: formData.risk_level,
    };

    await onSubmit(request);

    // Reset form
    setFormData({
      user_id: '',
      session_id: '',
      user_hash: '',
      severity: 'high',
      message: '',
      intent: 'support_request',
      risk_level: 2,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User ID */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            User ID <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent"
            placeholder="Enter user ID"
            disabled={loading}
          />
        </div>

        {/* Session ID */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Session ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.session_id}
            onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent"
            placeholder="Enter session ID"
            disabled={loading}
          />
        </div>

        {/* User Hash */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            User Hash (Anonymized) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.user_hash}
            onChange={(e) => setFormData({ ...formData, user_hash: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent"
            placeholder="Enter anonymized user hash"
            disabled={loading}
          />
        </div>

        {/* Severity */}
        <div>
          <label htmlFor="severity-select" className="block text-sm font-medium text-white/80 mb-2">
            Severity <span className="text-red-400">*</span>
          </label>
          <select
            id="severity-select"
            required
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'critical' | 'high' | 'moderate' | 'low' })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent"
            disabled={loading}
            aria-label="Select case severity"
          >
            <option value="critical" className="bg-[#001a47]">Critical (1 hour SLA)</option>
            <option value="high" className="bg-[#001a47]">High (4 hours SLA)</option>
            <option value="moderate" className="bg-[#001a47]">Moderate</option>
            <option value="low" className="bg-[#001a47]">Low</option>
          </select>
        </div>

        {/* Intent */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Intent
          </label>
          <input
            type="text"
            value={formData.intent}
            onChange={(e) => setFormData({ ...formData, intent: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent"
            placeholder="e.g., support_request, crisis_intervention"
            disabled={loading}
          />
        </div>

        {/* Risk Level */}
        <div>
          <label htmlFor="risk-level-input" className="block text-sm font-medium text-white/80 mb-2">
            Risk Level (0-3)
          </label>
          <input
            id="risk-level-input"
            type="number"
            min="0"
            max="3"
            value={formData.risk_level}
            onChange={(e) => setFormData({ ...formData, risk_level: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent"
            disabled={loading}
            aria-label="Risk level from 0 to 3"
            title="Risk level: 0=Low, 1=Moderate, 2=High, 3=Critical"
          />
          <p className="text-xs text-white/40 mt-1">0=Low, 1=Moderate, 2=High, 3=Critical</p>
        </div>

        {/* Message */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">
            Case Message <span className="text-red-400">*</span>
          </label>
          <textarea
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-transparent resize-none"
            placeholder="Enter detailed case description..."
            disabled={loading}
          />
        </div>
      </div>

      {/* CMA Workflow Info */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-white/70">
            <p className="font-medium text-emerald-300 mb-1">CMA Graph Workflow</p>
            <p>This form uses the Case Management Agent (CMA) graph workflow which will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
              <li>Calculate SLA deadline based on severity</li>
              <li>Automatically assign to available counselor</li>
              <li>Create case with complete tracking metadata</li>
              <li>Trigger SLA monitoring and alerts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#FFCA40] hover:bg-[#FFCA40]/90 disabled:bg-[#FFCA40]/50 text-[#00153a] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#FFCA40]/20 flex items-center gap-2 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-[#00153a]/20 border-t-[#00153a] rounded-full animate-spin" />
              Creating Case...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="w-5 h-5" />
              Create Case via CMA
            </>
          )}
        </button>
      </div>
    </form>
  );
}
