/**
 * Privacy Audit Component
 * 
 * Displays comprehensive privacy protection analytics with:
 * - Privacy budget tracking
 * - Differential privacy parameters
 * - K-anonymity compliance
 * - Data usage monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiShield, 
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiTrendingDown,
  FiInfo,
  FiClock,
  FiRefreshCw
} from 'react-icons/fi';

import { 
  getPrivacyAuditStatus,
  getPrivacyLevelColor,
  type PrivacyAuditStatus 
} from '@/services/clinicalAnalytics';

interface PrivacyAuditProps {
  className?: string;
}

export function PrivacyAudit({ className = '' }: PrivacyAuditProps) {
  const [auditReport, setAuditReport] = useState<PrivacyAuditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyAudit();
  }, []);

  const loadPrivacyAudit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPrivacyAuditStatus();

      if (response.success) {
        setAuditReport(response.data);
      } else {
        setError('Failed to load privacy audit report');
      }
    } catch (err) {
      console.error('Error loading privacy audit:', err);
      setError('Error loading privacy audit data');
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <FiAlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'violation':
        return <FiAlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FiInfo className="h-5 w-5 text-gray-600" />;
    }
  };





  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 rounded-lg h-12 w-full"></div>
          {[...Array(3)].map((_, i) => (
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
            <FiAlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Privacy Audit</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={loadPrivacyAudit}
                className="mt-3 text-red-700 hover:text-red-800 text-sm font-medium flex items-center space-x-1"
              >
                <FiRefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auditReport) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FiShield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No privacy audit data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Privacy Status Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FiShield className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Privacy Protection Status</h3>
          </div>
          <div className="flex items-center space-x-2">
            {getPrivacyStatusIcon(auditReport.budget_status.budget_status)}
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPrivacyLevelColor(auditReport.budget_status.budget_status)}`}>
              {auditReport.budget_status.budget_status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FiLock className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-gray-900">Budget Status</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {auditReport.budget_status.budget_status === 'healthy' ? 'Good' : 
               auditReport.budget_status.budget_status === 'warning' ? 'Warning' : 'Critical'}
            </div>
            <div className="text-xs text-gray-600">Overall budget health</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FiEye className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-gray-900">Privacy Budget</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(auditReport.budget_status.budget_used_percentage)}%
            </div>
            <div className="text-xs text-gray-600">Budget utilized</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FiActivity className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-gray-900">Analyses</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {auditReport.budget_status.analysis_count}
            </div>
            <div className="text-xs text-gray-600">Total analyses</div>
          </div>
        </div>
      </div>

      {/* Privacy Budget Tracking */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FiTrendingDown className="h-5 w-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">Privacy Budget Tracking</h4>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Budget</span>
            <span className="text-sm font-medium text-gray-900">
              {auditReport.budget_status.total_budget}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Used Budget</span>
            <span className="text-sm font-medium text-gray-900">
              {auditReport.budget_status.used_budget}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Remaining Budget</span>
            <span className="text-sm font-medium text-gray-900">
              {auditReport.budget_status.remaining_budget}
            </span>
          </div>

          {/* Budget Usage Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Budget Usage</span>
              <span>{Math.round(auditReport.budget_status.budget_used_percentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  auditReport.budget_status.budget_used_percentage <= 70 ? 'bg-green-600' :
                  auditReport.budget_status.budget_used_percentage <= 85 ? 'bg-yellow-600' : 'bg-red-600'
                } ${
                  auditReport.budget_status.budget_used_percentage <= 25 ? 'w-1/4' :
                  auditReport.budget_status.budget_used_percentage <= 50 ? 'w-1/2' :
                  auditReport.budget_status.budget_used_percentage <= 75 ? 'w-3/4' : 'w-full'
                }`}
              ></div>
            </div>
          </div>

          {auditReport.budget_status.budget_used_percentage > 85 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <div className="flex items-center space-x-2">
                <FiAlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Budget Warning</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Privacy budget usage is high. Consider reducing query frequency or implementing additional noise.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Indicators */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FiEyeOff className="h-5 w-5 text-gray-600" />
          <h4 className="font-medium text-gray-900">Compliance Indicators</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-900 mb-3">Budget Health</h5>
            <div className="flex items-center space-x-2">
              {auditReport.compliance_indicators.budget_healthy ? (
                <>
                  <FiCheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Healthy</span>
                </>
              ) : (
                <>
                  <FiAlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Unhealthy</span>
                </>
              )}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-900 mb-3">Analysis Count</h5>
            <div className="flex items-center space-x-2">
              {auditReport.compliance_indicators.analysis_count_reasonable ? (
                <>
                  <FiCheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Reasonable</span>
                </>
              ) : (
                <>
                  <FiAlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">High</span>
                </>
              )}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h5>
            <div className="flex items-center space-x-2">
              {auditReport.compliance_indicators.recent_activity ? (
                <>
                  <FiCheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Active</span>
                </>
              ) : (
                <>
                  <FiAlertCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Inactive</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Query Audit Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FiClock className="h-5 w-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">Recent Query Activity</h4>
          </div>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </span>
        </div>

        <div className="space-y-3">
          {auditReport.budget_status.recent_analyses.slice(0, 5).map((analysis: string, index: number) => {
            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{analysis}</div>
                  <div className="text-xs text-gray-600">
                    Recent analysis activity
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getPrivacyLevelColor(auditReport.budget_status.budget_status)}`}>
                  {auditReport.budget_status.budget_status}
                </span>
                <FiCheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </motion.div>
            );
          })}
        </div>

        {auditReport.budget_status.recent_analyses.length === 0 && (
          <div className="text-center py-8">
            <FiInfo className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">No recent query activity</p>
          </div>
        )}
      </div>

      {/* Privacy Recommendations */}
      {(auditReport.budget_status.recommendations.length > 0 || auditReport.recommendations.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <FiInfo className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Privacy Recommendations</h4>
          </div>
          <ul className="space-y-2">
            {auditReport.budget_status.recommendations.map((rec: string, idx: number) => (
              <li key={`budget-${idx}`} className="flex items-start space-x-2 text-sm text-blue-800">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <span>{rec}</span>
              </li>
            ))}
            {auditReport.recommendations.map((rec: string, idx: number) => (
              <li key={`general-${idx}`} className="flex items-start space-x-2 text-sm text-blue-800">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}