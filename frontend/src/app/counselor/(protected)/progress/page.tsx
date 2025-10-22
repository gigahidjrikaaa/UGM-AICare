'use client';

import { useState, useEffect } from 'react';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiUser,
  FiCalendar,
  FiActivity,
  FiBarChart2,
} from 'react-icons/fi';

interface ProgressData {
  patient_id: string;
  patient_id_hash: string;
  patient_name?: string;
  tracking_period: string;
  metrics: {
    mood_scores: number[];
    distress_levels: number[];
    engagement_rate: number;
    session_attendance: number;
    goal_completion: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  last_assessment: string;
}

const trendConfig = {
  improving: {
    icon: FiTrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    label: 'Improving',
  },
  stable: {
    icon: FiMinus,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    label: 'Stable',
  },
  declining: {
    icon: FiTrendingDown,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    label: 'Needs Attention',
  },
};

export default function CounselorProgressPage() {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const data = await apiCall<ProgressData[]>('/api/counselor/progress');
      
      // Mock data
      const mockData: ProgressData[] = [
        {
          patient_id: 'PAT-001',
          patient_id_hash: 'user_abc123',
          patient_name: 'Patient A',
          tracking_period: '30 days',
          metrics: {
            mood_scores: [5, 6, 6, 7, 7, 8, 8],
            distress_levels: [8, 7, 7, 6, 5, 5, 4],
            engagement_rate: 85,
            session_attendance: 90,
            goal_completion: 75,
          },
          trend: 'improving',
          last_assessment: '2025-10-20',
        },
        {
          patient_id: 'PAT-002',
          patient_id_hash: 'user_def456',
          patient_name: 'Patient B',
          tracking_period: '30 days',
          metrics: {
            mood_scores: [7, 7, 8, 8, 8, 8, 9],
            distress_levels: [5, 5, 4, 4, 3, 3, 3],
            engagement_rate: 95,
            session_attendance: 100,
            goal_completion: 85,
          },
          trend: 'improving',
          last_assessment: '2025-10-18',
        },
        {
          patient_id: 'PAT-003',
          patient_id_hash: 'user_ghi789',
          patient_name: 'Patient C',
          tracking_period: '30 days',
          metrics: {
            mood_scores: [6, 6, 5, 5, 5, 4, 4],
            distress_levels: [5, 6, 6, 7, 7, 8, 8],
            engagement_rate: 60,
            session_attendance: 70,
            goal_completion: 45,
          },
          trend: 'declining',
          last_assessment: '2025-10-19',
        },
      ];
      
      setProgressData(mockData);
      setError(null);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      setError('Failed to load progress tracking data');
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

  const calculateAverage = (scores: number[]) => {
    if (scores.length === 0) return 0;
    return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
  };

  const improvingCount = progressData.filter((p) => p.trend === 'improving').length;
  const decliningCount = progressData.filter((p) => p.trend === 'declining').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading progress data...</p>
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
            <FiActivity className="w-8 h-8 text-[#FFCA40]" />
            Progress Tracking
          </h1>
          <p className="text-white/60">Monitor patient outcomes and treatment effectiveness</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{progressData.length}</div>
          <div className="text-xs text-white/60 mt-1">Patients Tracked</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{improvingCount}</div>
          <div className="text-xs text-white/60 mt-1">Improving</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">{decliningCount}</div>
          <div className="text-xs text-white/60 mt-1">Needs Attention</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {(progressData.reduce((sum, p) => sum + p.metrics.engagement_rate, 0) / progressData.length || 0).toFixed(0)}%
          </div>
          <div className="text-xs text-white/60 mt-1">Avg Engagement</div>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="space-y-4">
        {progressData.length === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
            <FiBarChart2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No progress data available</p>
          </div>
        ) : (
          progressData.map((patient) => {
            const TrendIcon = trendConfig[patient.trend].icon;
            return (
              <div
                key={patient.patient_id}
                className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FiUser className="w-4 h-4 text-white/40" />
                      <span className="text-lg font-medium text-white">
                        {patient.patient_name || patient.patient_id_hash}
                      </span>
                      <span className="text-xs text-white/50 font-mono">{patient.patient_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <FiCalendar className="w-3 h-3" />
                      <span>Tracking period: {patient.tracking_period}</span>
                      <span className="mx-2">•</span>
                      <span>Last assessment: {formatDate(patient.last_assessment)}</span>
                    </div>
                  </div>

                  {/* Trend Badge */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 ${trendConfig[patient.trend].bg} border border-white/10 rounded-lg`}>
                    <TrendIcon className={`w-4 h-4 ${trendConfig[patient.trend].color}`} />
                    <span className={`text-sm font-medium ${trendConfig[patient.trend].color}`}>
                      {trendConfig[patient.trend].label}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Mood Score */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">Avg Mood</span>
                      <span className="text-lg font-bold text-[#FFCA40]">
                        {calculateAverage(patient.metrics.mood_scores)}/10
                      </span>
                    </div>
                    <div className="flex gap-0.5">
                      {patient.metrics.mood_scores.slice(-7).map((score, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-white/10 rounded overflow-hidden"
                          style={{ height: '40px' }}
                        >
                          <div
                            className="bg-[#FFCA40] w-full"
                            style={{ height: `${(score / 10) * 100}%`, marginTop: 'auto' }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distress Level */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">Avg Distress</span>
                      <span className="text-lg font-bold text-orange-400">
                        {calculateAverage(patient.metrics.distress_levels)}/10
                      </span>
                    </div>
                    <div className="flex gap-0.5">
                      {patient.metrics.distress_levels.slice(-7).map((level, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-white/10 rounded overflow-hidden"
                          style={{ height: '40px' }}
                        >
                          <div
                            className="bg-orange-400 w-full"
                            style={{ height: `${(level / 10) * 100}%`, marginTop: 'auto' }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Engagement Rate */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <span className="text-xs text-white/60 block mb-2">Engagement</span>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-white">
                        {patient.metrics.engagement_rate}
                      </span>
                      <span className="text-sm text-white/60 mb-1">%</span>
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400"
                        style={{ width: `${patient.metrics.engagement_rate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Session Attendance */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <span className="text-xs text-white/60 block mb-2">Attendance</span>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-white">
                        {patient.metrics.session_attendance}
                      </span>
                      <span className="text-sm text-white/60 mb-1">%</span>
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400"
                        style={{ width: `${patient.metrics.session_attendance}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Goal Completion */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <span className="text-xs text-white/60 block mb-2">Goal Progress</span>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-white">
                        {patient.metrics.goal_completion}
                      </span>
                      <span className="text-sm text-white/60 mb-1">%</span>
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FFCA40]"
                        style={{ width: `${patient.metrics.goal_completion}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-end gap-2">
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all">
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all">
                    Generate Report
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
