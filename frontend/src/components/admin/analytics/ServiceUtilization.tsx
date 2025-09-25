/**
 * Service Utilization Component
 * 
 * Displays comprehensive service usage analytics with:
 * - Resource allocation analysis
 * - Utilization efficiency metrics
 * - Service optimization recommendations
 * - Privacy-preserving statistics
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiClock,
  FiActivity,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckCircle,
  FiBarChart,
  FiCalendar,
  FiFilter
} from 'react-icons/fi';

import { 
  getServiceUtilizationMetrics,
  formatPercentage,
  formatDuration,
  getEfficiencyColor,
  type ServiceUtilizationMetric 
} from '@/services/clinicalAnalytics';

interface ServiceUtilizationProps {
  className?: string;
}

export function ServiceUtilization({ className = '' }: ServiceUtilizationProps) {
  const [metrics, setMetrics] = useState<Record<string, ServiceUtilizationMetric>>({});
  const [filteredMetrics, setFilteredMetrics] = useState<Record<string, ServiceUtilizationMetric>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [utilizationFilter, setUtilizationFilter] = useState<string>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<number>(30);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getServiceUtilizationMetrics({
          timePeriodDays: timePeriod,
          privacyLevel: 'medium'
        });

        if (response.success) {
          setMetrics(response.data);
        } else {
          setError('Failed to load service utilization data');
        }
      } catch (err) {
        console.error('Error loading service utilization:', err);
        setError('Error loading service utilization data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timePeriod]);

  useEffect(() => {
    let filtered = { ...metrics };

    // Filter by service type
    if (serviceTypeFilter !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, metric]) => 
          metric.service_type.toLowerCase().includes(serviceTypeFilter.toLowerCase())
        )
      );
    }

    // Filter by utilization level
    if (utilizationFilter !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, metric]) => {
          const utilization = metric.utilization_rate;
          switch (utilizationFilter) {
            case 'high': return utilization >= 0.8;
            case 'medium': return utilization >= 0.5 && utilization < 0.8;
            case 'low': return utilization < 0.5;
            default: return true;
          }
        })
      );
    }

    // Filter by efficiency level
    if (efficiencyFilter !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, metric]) => {
          const efficiency = metric.efficiency_score;
          switch (efficiencyFilter) {
            case 'high': return efficiency >= 0.8;
            case 'medium': return efficiency >= 0.6 && efficiency < 0.8;
            case 'low': return efficiency < 0.6;
            default: return true;
          }
        })
      );
    }

    setFilteredMetrics(filtered);
  }, [metrics, serviceTypeFilter, utilizationFilter, efficiencyFilter]);



  const getUniqueServiceTypes = () => {
    return [...new Set(Object.values(metrics).map(m => m.service_type))];
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'therapy_session':
        return <FiUsers className="h-5 w-5 text-blue-600" />;
      case 'assessment':
        return <FiBarChart className="h-5 w-5 text-purple-600" />;
      case 'support_session':
        return <FiActivity className="h-5 w-5 text-green-600" />;
      case 'crisis_intervention':
        return <FiAlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <FiClock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getUtilizationStatus = (rate: number) => {
    if (rate >= 0.8) return { label: 'High', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    if (rate >= 0.5) return { label: 'Optimal', color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
    return { label: 'Low', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 rounded-lg h-12 w-full"></div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32 w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <FiAlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Service Utilization</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 text-red-700 hover:text-red-800 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Time Period and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FiFilter className="h-4 w-4 text-gray-600" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <FiCalendar className="h-4 w-4 text-gray-600" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(Number(e.target.value))}
              aria-label="Time period for analysis"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type
            </label>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              aria-label="Filter by service type"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Service Types</option>
              {getUniqueServiceTypes().map(serviceType => (
                <option key={serviceType} value={serviceType}>{serviceType.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Utilization Level
            </label>
            <select
              value={utilizationFilter}
              onChange={(e) => setUtilizationFilter(e.target.value)}
              aria-label="Filter by utilization level"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="high">High (≥80%)</option>
              <option value="medium">Optimal (50-79%)</option>
              <option value="low">Low (&lt;50%)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Efficiency Level
            </label>
            <select
              value={efficiencyFilter}
              onChange={(e) => setEfficiencyFilter(e.target.value)}
              aria-label="Filter by efficiency level"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Efficiency Levels</option>
              <option value="high">High (≥80%)</option>
              <option value="medium">Medium (60-79%)</option>
              <option value="low">Low (&lt;60%)</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {Object.keys(filteredMetrics).length} of {Object.keys(metrics).length} services
        </div>
      </div>

      {/* Service Utilization Metrics */}
      <div className="space-y-4">
        {Object.entries(filteredMetrics).length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <FiBarChart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No service metrics match your current filters</p>
            <button
              onClick={() => {
                setServiceTypeFilter('all');
                setUtilizationFilter('all');
                setEfficiencyFilter('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          Object.entries(filteredMetrics).map(([key, metric], index) => {
            const utilizationStatus = getUtilizationStatus(metric.utilization_rate);
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getServiceIcon(metric.service_type)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {metric.service_type.replace('_', ' ').toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {metric.total_sessions} total sessions • {metric.unique_users} unique users
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${utilizationStatus.bg} ${utilizationStatus.color}`}>
                        {utilizationStatus.label} Utilization
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getEfficiencyColor(metric.efficiency_score)}`}>
                        {formatPercentage(metric.efficiency_score)} Efficient
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600 mb-1">Utilization Rate</div>
                      <div className="font-semibold text-gray-900">
                        {formatPercentage(metric.utilization_rate)}
                      </div>
                      <div className="text-xs text-gray-600">
                        of available capacity
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600 mb-1">Average Duration</div>
                      <div className="font-semibold text-gray-900">
                        {formatDuration(metric.average_session_duration)}
                      </div>
                      <div className="text-xs text-gray-600">
                        per session
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600 mb-1">No-Show Rate</div>
                      <div className="font-semibold text-gray-900">
                        {formatPercentage(metric.no_show_rate)}
                      </div>
                      <div className="text-xs flex items-center space-x-1">
                        {metric.no_show_rate <= 0.1 ? (
                          <>
                            <FiCheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-green-600">Good</span>
                          </>
                        ) : (
                          <>
                            <FiAlertTriangle className="h-3 w-3 text-yellow-500" />
                            <span className="text-yellow-600">Needs attention</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600 mb-1">Peak Utilization</div>
                      <div className="font-semibold text-gray-900">
                        {formatPercentage(metric.peak_utilization)}
                      </div>
                      <div className="text-xs text-gray-600">
                        maximum capacity
                      </div>
                    </div>
                  </div>

                  {/* Resource Allocation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Resource Allocation</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Available Capacity</span>
                          <span className="text-sm font-medium text-gray-900">{metric.available_capacity} hrs/week</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Used Capacity</span>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(metric.available_capacity * metric.utilization_rate)} hrs/week
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Wait Time (avg)</span>
                          <span className="text-sm font-medium text-gray-900">{formatDuration(metric.average_wait_time)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Efficiency Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Completion Rate</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPercentage(1 - metric.no_show_rate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Efficiency Score</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPercentage(metric.efficiency_score)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">User Satisfaction</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPercentage(metric.user_satisfaction_score)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimization Recommendations */}
                  {metric.optimization_recommendations.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center space-x-2">
                        <FiTrendingUp className="h-4 w-4 text-blue-500" />
                        <span>Optimization Recommendations</span>
                      </h4>
                      <ul className="space-y-1">
                        {metric.optimization_recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Summary Analytics */}
      {Object.keys(filteredMetrics).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <FiBarChart className="h-4 w-4 text-gray-600" />
            <span>Utilization Summary</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(
                  Object.values(filteredMetrics).reduce((sum, m) => sum + m.utilization_rate, 0) / 
                  Object.keys(filteredMetrics).length
                )}
              </div>
              <div className="text-sm text-gray-600">Average Utilization</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(filteredMetrics).reduce((sum, m) => sum + m.total_sessions, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.values(filteredMetrics).reduce((sum, m) => sum + m.unique_users, 0)}
              </div>
              <div className="text-sm text-gray-600">Unique Users Served</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(
                  Object.values(filteredMetrics).reduce((sum, m) => sum + m.efficiency_score, 0) / 
                  Object.keys(filteredMetrics).length
                )}
              </div>
              <div className="text-sm text-gray-600">Average Efficiency</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}