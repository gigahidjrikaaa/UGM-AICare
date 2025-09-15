'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';
import { FiActivity, FiBarChart2, FiPlayCircle } from '@/icons';

interface Insight {
    title: string;
    description: string;
    severity: string;
    data: Record<string, unknown>;
}

interface Pattern {
    name: string;
    description: string;
    count: number;
}

interface AnalyticsReport {
    id: number;
    generated_at: string;
    report_period: string;
    insights: Insight[];
    trends: { patterns: Pattern[] };
    recommendations: string[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      </div>
      <div className={`p-3 bg-${color}-500/20 rounded-lg`}>
        {icon}
      </div>
    </div>
    {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
  </motion.div>
);

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const reportData = await apiCall<any>('/api/v1/admin/analytics');
      // Backend may return a message when there's no report yet
      if (reportData && typeof reportData === 'object' && 'id' in reportData) {
        setReport(reportData as AnalyticsReport);
      } else {
        setReport(null);
      }
    } catch (error) {
      console.error('Error fetching analytics report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load analytics report');
    } finally {
      setLoading(false);
    }
  };

  const runAgent = async () => {
    try {
      setRunning(true);
      const result = await apiCall<{ message: string, report: AnalyticsReport }>('/api/v1/admin/analytics/run', { method: 'POST' });
      toast.success(result.message);
      setReport(result.report);
    } catch (error) {
      console.error('Error running analytics agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run analytics agent');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-6 w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 h-28"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <FiBarChart2 className="mr-3 text-[#FFCA40]" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 mt-1">AI-powered insights into platform usage and user well-being.</p>
        </div>
        <button
          onClick={runAgent}
          disabled={running}
          className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <FiPlayCircle className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running Agent...' : 'Generate New Report'}
        </button>
      </div>

      {!report ? (
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
              <FiBarChart2 className="text-[#FFCA40]" />
            </div>
            <h2 className="text-2xl font-semibold text-white">No Analytics Yet</h2>
            <p className="text-gray-300 mt-2">Generate your first AI-powered analytics report to see usage patterns, insights and recommendations.</p>
            <p className="text-gray-400 mt-1">Click "Generate New Report" above to get started.</p>
          </div>

          {/* Preview of what will appear */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Patterns preview */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-5">
              <h3 className="text-white font-semibold mb-3">Key Patterns (Preview)</h3>
              <div className="grid grid-cols-1 gap-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/10">
                    <div>
                      <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-24 bg-white/10 rounded" />
                    </div>
                    <div className="h-6 w-12 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Insights preview */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-5">
              <h3 className="text-white font-semibold mb-3">AI-Generated Insights (Preview)</h3>
              <div className="space-y-3">
                {[1,2].map((i) => (
                  <div key={i} className="p-4 rounded-md bg-white/5 border border-white/10">
                    <div className="h-4 w-48 bg-white/10 rounded mb-2" />
                    <div className="h-3 w-full bg-white/10 rounded mb-1" />
                    <div className="h-3 w-2/3 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations preview */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-5">
              <h3 className="text-white font-semibold mb-3">Recommendations (Preview)</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center"><span className="h-2 w-2 rounded-full bg-white/30 mr-2"/> <span className="h-3 w-56 bg-white/10 rounded inline-block"/></li>
                <li className="flex items-center"><span className="h-2 w-2 rounded-full bg-white/30 mr-2"/> <span className="h-3 w-48 bg-white/10 rounded inline-block"/></li>
                <li className="flex items-center"><span className="h-2 w-2 rounded-full bg-white/30 mr-2"/> <span className="h-3 w-40 bg-white/10 rounded inline-block"/></li>
              </ul>
              <p className="text-xs text-gray-400 mt-3">These will be tailored based on your users’ recent activity.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Key Patterns (Last {report.report_period})</h2>
            {report.trends?.patterns?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {report.trends.patterns.map((pattern, index) => (
                  <StatCard key={index} title={pattern.name} value={pattern.count} icon={<FiActivity className="h-6 w-6 text-blue-400" />} description={pattern.description} color="blue" />
                ))}
              </div>
            ) : (
              <div className="text-gray-400 bg-white/5 border border-white/10 rounded-lg p-6">No patterns detected for this period.</div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">AI-Generated Insights</h2>
            {report.insights?.length ? (
              <div className="space-y-4">
                {report.insights.map((insight, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 p-4 rounded-lg">
                    <h3 className={`font-bold ${insight.severity === 'High' ? 'text-red-400' : insight.severity === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>{insight.title}</h3>
                    <p className="text-gray-300">{insight.description}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 bg-white/5 border border-white/10 rounded-lg p-6">No insights generated for this report.</div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Recommendations</h2>
            {report.recommendations?.length ? (
              <ul className="space-y-2 list-disc list-inside text-gray-300">
                {report.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-400 bg-white/5 border border-white/10 rounded-lg p-6">No recommendations available for this report.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
