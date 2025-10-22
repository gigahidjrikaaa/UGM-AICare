'use client';

import { useState, useEffect } from 'react';
import {
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiEdit,
  FiPlus,
  FiTrendingUp,
  FiAlertCircle,
} from 'react-icons/fi';

interface TreatmentPlan {
  plan_id: string;
  patient_id_hash: string;
  patient_name?: string;
  diagnosis?: string;
  goals: string[];
  interventions: string[];
  start_date: string;
  review_date: string;
  status: 'active' | 'completed' | 'on_hold' | 'revised';
  progress_percentage: number;
  created_by: string;
  last_updated: string;
}

const statusColors = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  on_hold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  revised: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export default function CounselorTreatmentPlansPage() {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const data = await apiCall<TreatmentPlan[]>('/api/counselor/treatment-plans');
      
      // Mock data
      const mockPlans: TreatmentPlan[] = [
        {
          plan_id: 'PLAN-001',
          patient_id_hash: 'user_abc123',
          patient_name: 'Patient A',
          diagnosis: 'Generalized Anxiety Disorder',
          goals: [
            'Reduce anxiety symptoms to manageable levels',
            'Develop effective coping strategies',
            'Improve sleep quality',
          ],
          interventions: [
            'Cognitive Behavioral Therapy (CBT)',
            'Mindfulness meditation exercises',
            'Progressive muscle relaxation',
          ],
          start_date: '2025-09-15',
          review_date: '2025-11-15',
          status: 'active',
          progress_percentage: 65,
          created_by: 'Dr. Smith',
          last_updated: '2025-10-20',
        },
        {
          plan_id: 'PLAN-002',
          patient_id_hash: 'user_def456',
          patient_name: 'Patient B',
          diagnosis: 'Major Depressive Disorder',
          goals: [
            'Reduce depressive symptoms',
            'Increase daily activity levels',
            'Improve social connections',
          ],
          interventions: [
            'Behavioral activation',
            'Interpersonal therapy',
            'Journaling exercises',
          ],
          start_date: '2025-08-10',
          review_date: '2025-10-10',
          status: 'active',
          progress_percentage: 80,
          created_by: 'Dr. Smith',
          last_updated: '2025-10-18',
        },
      ];
      
      setPlans(mockPlans);
      setError(null);
    } catch (err) {
      console.error('Failed to load treatment plans:', err);
      setError('Failed to load treatment plans');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredPlans = plans.filter((plan) => {
    if (filterStatus === 'all') return true;
    return plan.status === filterStatus;
  });

  const activeCount = plans.filter((p) => p.status === 'active').length;
  const completedCount = plans.filter((p) => p.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading treatment plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiTarget className="w-8 h-8 text-[#FFCA40]" />
            Treatment Plans
          </h1>
          <p className="text-white/60">Create and manage patient treatment plans</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter treatment plans by status"
          >
            <option value="all" className="bg-[#001d58]">All Status</option>
            <option value="active" className="bg-[#001d58]">Active</option>
            <option value="completed" className="bg-[#001d58]">Completed</option>
            <option value="on_hold" className="bg-[#001d58]">On Hold</option>
            <option value="revised" className="bg-[#001d58]">Revised</option>
          </select>
          <button className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all flex items-center gap-2">
            <FiPlus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{activeCount}</div>
          <div className="text-xs text-white/60 mt-1">Active Plans</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{completedCount}</div>
          <div className="text-xs text-white/60 mt-1">Completed</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {plans.length}
          </div>
          <div className="text-xs text-white/60 mt-1">Total Plans</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {plans.reduce((sum, p) => sum + p.progress_percentage, 0) / plans.length || 0}%
          </div>
          <div className="text-xs text-white/60 mt-1">Avg Progress</div>
        </div>
      </div>

      {/* Treatment Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
            <FiTarget className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No treatment plans found</p>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.plan_id}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-white/90">{plan.plan_id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[plan.status]}`}>
                      {plan.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <FiUser className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/80">
                      {plan.patient_name || plan.patient_id_hash}
                    </span>
                  </div>
                  {plan.diagnosis && (
                    <div className="flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 text-[#FFCA40]" />
                      <span className="text-sm text-white/70">{plan.diagnosis}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <button 
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all"
                  title="Edit treatment plan"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">Overall Progress</span>
                  <span className="text-xs font-medium text-[#FFCA40]">{plan.progress_percentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FFCA40] to-[#FFD55C] transition-all"
                    style={{ width: `${plan.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Goals */}
              <div className="mb-4">
                <p className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                  <FiTarget className="w-4 h-4 text-[#FFCA40]" />
                  Treatment Goals:
                </p>
                <ul className="space-y-1.5">
                  {plan.goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-white/70">
                      <FiCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interventions */}
              <div className="mb-4">
                <p className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                  <FiTrendingUp className="w-4 h-4 text-[#FFCA40]" />
                  Interventions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {plan.interventions.map((intervention, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70"
                    >
                      {intervention}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <FiClock className="w-3 h-3" />
                    Started: {formatDate(plan.start_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    Review: {formatDate(plan.review_date)}
                  </span>
                </div>
                <span>Last updated: {formatDate(plan.last_updated)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
