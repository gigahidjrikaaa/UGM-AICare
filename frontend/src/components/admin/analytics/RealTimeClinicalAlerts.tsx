/**
 * Real-Time Clinical Alerts System
 * 
 * Monitoring system for high-risk situations requiring immediate professional attention.
 * Provides clinicians with real-time notifications and automated escalation protocols.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBell,
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiUser,
  FiClock,
  FiFilter,
  FiRefreshCw,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiArrowRight
} from 'react-icons/fi';

// Note: Import services would come from actual implementation
// import { getClinicalAlerts, acknowledgeAlert, escalateAlert } from '@/services/clinicalAlerts';

interface AlertTrigger {
  id: string;
  alertId: number;
  userId: number;
  userName: string;
  userEmail: string;
  type: 'crisis_risk' | 'self_harm_indicators' | 'medication_adherence' | 'missed_appointments' | 'behavioral_change' | 'emergency_contact';
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'immediate' | 'urgent' | 'standard' | 'informational';
  title: string;
  description: string;
  details: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  escalatedAt?: string;
  escalationLevel: number;
  maxEscalationLevel: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated' | 'expired';
  metadata: {
    riskScore: number;
    confidence: number;
    dataPoints: string[];
    recommendedActions: string[];
    urgencyFactors: string[];
    clinicalContext: string;
  };
  autoEscalationTime?: string;
  contactAttempts: number;
  lastContactAttempt?: string;
}

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  escalated: number;
  avgResponseTime: number;
  last24Hours: number;
}

interface RealTimeClinicalAlertsProps {
  className?: string;
}

export function RealTimeClinicalAlerts({ className = '' }: RealTimeClinicalAlertsProps) {
  const [alerts, setAlerts] = useState<AlertTrigger[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Alert management states
  const [selectedAlert, setSelectedAlert] = useState<AlertTrigger | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [acknowledgmentNote, setAcknowledgmentNote] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  // Real-time updates
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration - in real implementation, this would call an API
      const mockAlerts: AlertTrigger[] = [
        {
          id: 'alert_001',
          alertId: 1,
          userId: 123,
          userName: 'John Doe',
          userEmail: 'john.doe@example.com',
          type: 'crisis_risk',
          severity: 'critical',
          priority: 'immediate',
          title: 'Crisis Risk Detected - Immediate Intervention Required',
          description: 'Patient showing acute crisis indicators based on recent assessments and behavioral patterns.',
          details: 'Multiple risk factors detected: PHQ-9 score increased to 23, recent life stressor (job loss), reduced social support, history of previous attempts. Immediate clinical assessment recommended.',
          triggeredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
          status: 'active',
          escalationLevel: 0,
          maxEscalationLevel: 3,
          metadata: {
            riskScore: 0.92,
            confidence: 0.87,
            dataPoints: ['PHQ-9: 23/27', 'Recent stressor event', 'Social support decline', 'Previous attempt history'],
            recommendedActions: [
              'Immediate clinical assessment',
              'Safety planning session',
              'Crisis intervention protocol',
              'Emergency contact notification'
            ],
            urgencyFactors: ['High suicide risk score', 'Acute onset', 'Multiple risk factors'],
            clinicalContext: 'Patient has been experiencing worsening depression symptoms over the past 2 weeks with significant functional impairment.'
          },
          autoEscalationTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes from now
          contactAttempts: 0
        },
        {
          id: 'alert_002',
          alertId: 2,
          userId: 456,
          userName: 'Jane Smith',
          userEmail: 'jane.smith@example.com',
          type: 'medication_adherence',
          severity: 'high',
          priority: 'urgent',
          title: 'Medication Adherence Alert',
          description: 'Patient has missed multiple medication doses over the past week.',
          details: 'Medication tracking shows 4 missed doses of prescribed antidepressant (sertraline 100mg) over 7-day period. Last reported dose was 3 days ago.',
          triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          acknowledgedBy: 'Dr. Sarah Wilson',
          status: 'acknowledged',
          escalationLevel: 0,
          maxEscalationLevel: 2,
          metadata: {
            riskScore: 0.68,
            confidence: 0.94,
            dataPoints: ['4 missed doses/7 days', 'Last dose: 3 days ago', 'Medication: Sertraline 100mg'],
            recommendedActions: [
              'Contact patient for adherence discussion',
              'Review medication barriers',
              'Consider dose adjustment or alternative',
              'Implement adherence support tools'
            ],
            urgencyFactors: ['Extended gap in medication', 'Depression symptoms may worsen'],
            clinicalContext: 'Patient started on sertraline 6 weeks ago with good initial response. Recent adherence issues may indicate side effects or other barriers.'
          },
          contactAttempts: 1,
          lastContactAttempt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'alert_003',
          alertId: 3,
          userId: 789,
          userName: 'Alex Wilson',
          userEmail: 'alex.wilson@example.com',
          type: 'behavioral_change',
          severity: 'medium',
          priority: 'standard',
          title: 'Significant Behavioral Pattern Change',
          description: 'AI analysis detected notable changes in user engagement and mood patterns.',
          details: 'User engagement with therapeutic content has decreased by 70% over past 2 weeks. Sleep pattern disruption noted (average sleep: 4.2 hours vs previous 7.1 hours). Mood tracking shows consistent decline.',
          triggeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          status: 'active',
          escalationLevel: 0,
          maxEscalationLevel: 2,
          metadata: {
            riskScore: 0.54,
            confidence: 0.76,
            dataPoints: ['Engagement drop: 70%', 'Sleep avg: 4.2hrs (prev 7.1hrs)', 'Mood trend: declining'],
            recommendedActions: [
              'Schedule check-in call',
              'Review current treatment plan',
              'Assess for external stressors',
              'Consider sleep hygiene intervention'
            ],
            urgencyFactors: ['Dramatic engagement change', 'Sleep disruption', 'Mood decline'],
            clinicalContext: 'Patient previously had good engagement with digital therapy tools. Current changes may indicate onset of depressive episode or external stressors.'
          },
          contactAttempts: 0
        }
      ];

      const mockStats: AlertStats = {
        total: 23,
        active: 5,
        acknowledged: 8,
        resolved: 10,
        critical: 1,
        escalated: 2,
        avgResponseTime: 18, // minutes
        last24Hours: 7
      };

      setAlerts(mockAlerts);
      setStats(mockStats);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading clinical alerts:', err);
      setError('Error loading clinical alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Auto-refresh alerts every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadAlerts]);

  const handleAcknowledgeAlert = async (alertId: number, note: string) => {
    try {
      // Mock acknowledgment - in real implementation, this would call an API
      console.log(`Acknowledging alert ${alertId} with note: ${note}`);
      
      setAlerts(prev => prev.map(alert => 
        alert.alertId === alertId 
          ? { 
              ...alert, 
              status: 'acknowledged' as const,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: 'Current User' // In real app, get from auth context
            }
          : alert
      ));
      
      setSelectedAlert(null);
      setShowAlertModal(false);
      setAcknowledgmentNote('');
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError('Error acknowledging alert');
    }
  };

  const handleEscalateAlert = async (alertId: number, reason: string) => {
    try {
      // Mock escalation - in real implementation, this would call an API
      console.log(`Escalating alert ${alertId} with reason: ${reason}`);
      
      setAlerts(prev => prev.map(alert => 
        alert.alertId === alertId 
          ? { 
              ...alert, 
              status: 'escalated' as const,
              escalatedAt: new Date().toISOString(),
              escalationLevel: alert.escalationLevel + 1
            }
          : alert
      ));
      
      setSelectedAlert(null);
      setShowAlertModal(false);
      setEscalationReason('');
    } catch (err) {
      console.error('Error escalating alert:', err);
      setError('Error escalating alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crisis_risk': return <FiAlertTriangle className="h-4 w-4 text-red-600" />;
      case 'self_harm_indicators': return <FiAlertCircle className="h-4 w-4 text-red-600" />;
      case 'medication_adherence': return <FiClock className="h-4 w-4 text-orange-600" />;
      case 'missed_appointments': return <FiClock className="h-4 w-4 text-yellow-600" />;
      case 'behavioral_change': return <FiUser className="h-4 w-4 text-blue-600" />;
      case 'emergency_contact': return <FiPhone className="h-4 w-4 text-purple-600" />;
      default: return <FiInfo className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 rounded-lg h-12 w-full"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24 w-full"></div>
            ))}
          </div>
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
            <FiAlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Clinical Alerts</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={loadAlerts}
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <FiBell className="h-5 w-5 text-red-600" />
              <span>Real-Time Clinical Alerts</span>
              {stats && stats.active > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {stats.active} Active
                </span>
              )}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Real-time monitoring for high-risk situations requiring immediate attention
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()} 
              {autoRefresh && <span className="ml-2">• Auto-refresh enabled</span>}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md border ${
                autoRefresh 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <FiBell className="h-4 w-4" />
              <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
            </button>
            <button
              onClick={loadAlerts}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FiRefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-red-800">{stats.critical}</p>
              <p className="text-xs text-gray-600">Critical</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</p>
              <p className="text-xs text-gray-600">Acknowledged</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-gray-600">Resolved</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.escalated}</p>
              <p className="text-xs text-gray-600">Escalated</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}m</p>
              <p className="text-xs text-gray-600">Avg Response</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.last24Hours}</p>
              <p className="text-xs text-gray-600">Last 24h</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Critical Alerts Banner */}
      {stats && stats.critical > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg"
        >
          <div className="flex items-center">
            <FiAlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Critical Alerts Require Immediate Attention
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {stats.critical} critical alert{stats.critical > 1 ? 's' : ''} need{stats.critical === 1 ? 's' : ''} immediate clinical intervention
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <FiFilter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Filter by alert status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Filter by alert severity"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Filter by alert type"
            >
              <option value="all">All Types</option>
              <option value="crisis_risk">Crisis Risk</option>
              <option value="self_harm_indicators">Self Harm</option>
              <option value="medication_adherence">Medication</option>
              <option value="missed_appointments">Appointments</option>
              <option value="behavioral_change">Behavioral Change</option>
              <option value="emergency_contact">Emergency Contact</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredAlerts.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <FiCheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No clinical alerts match your current filters</p>
              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-lg shadow-sm border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-500' :
                  alert.severity === 'high' ? 'border-orange-500' :
                  alert.severity === 'medium' ? 'border-yellow-500' :
                  'border-green-500'
                } ${alert.status === 'active' && alert.severity === 'critical' ? 'animate-pulse' : ''}`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getTypeIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{alert.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity} severity
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(alert.status)}`}>
                            {alert.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.triggeredAt).toLocaleString()}
                          </span>
                          {alert.escalationLevel > 0 && (
                            <span className="text-xs text-purple-600 font-medium">
                              Escalation Level {alert.escalationLevel}/{alert.maxEscalationLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {Math.round(alert.metadata.riskScore * 100)}%
                      </div>
                      <div className="text-xs text-gray-600">risk score</div>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      <FiUser className="h-4 w-4" />
                      <span>Patient Information</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <div className="font-medium text-gray-900">{alert.userName}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <div className="font-medium text-gray-900">{alert.userEmail}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">User ID:</span>
                        <div className="font-medium text-gray-900">{alert.userId}</div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Details */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Clinical Details</h4>
                    <p className="text-gray-700 text-sm mb-3">{alert.details}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Key Data Points:</span>
                        <ul className="mt-1 space-y-1">
                          {alert.metadata.dataPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-gray-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0"></div>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Urgency Factors:</span>
                        <ul className="mt-1 space-y-1">
                          {alert.metadata.urgencyFactors.map((factor, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-gray-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Recommended Actions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {alert.metadata.recommendedActions.map((action, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded">
                          <FiArrowRight className="h-3 w-3 text-blue-600" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-escalation Warning */}
                  {alert.autoEscalationTime && alert.status === 'active' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <FiClock className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-800 text-sm font-medium">
                          Auto-escalation in {Math.max(0, Math.floor((new Date(alert.autoEscalationTime).getTime() - Date.now()) / (1000 * 60)))} minutes
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Acknowledgment Info */}
                  {alert.acknowledgedAt && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="text-yellow-800 text-sm">
                        <strong>Acknowledged:</strong> {new Date(alert.acknowledgedAt).toLocaleString()}
                        {alert.acknowledgedBy && <span> by {alert.acknowledgedBy}</span>}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setShowAlertModal(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                    >
                      <FiEye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                    
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.alertId, 'Quick acknowledgment')}
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100"
                        >
                          <FiCheckCircle className="h-4 w-4" />
                          <span>Acknowledge</span>
                        </button>
                        
                        {alert.severity === 'critical' && (
                          <button
                            onClick={() => handleEscalateAlert(alert.alertId, 'Critical situation requires escalation')}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                          >
                            <FiPhone className="h-4 w-4" />
                            <span>Escalate</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Alert Detail Modal */}
      {showAlertModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Alert Management</h3>
                <button
                  onClick={() => {
                    setShowAlertModal(false);
                    setSelectedAlert(null);
                    setAcknowledgmentNote('');
                    setEscalationReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close alert management modal"
                >
                  <FiXCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Alert Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedAlert.title}</h4>
                  <p className="text-gray-600 text-sm">{selectedAlert.description}</p>
                  <div className="mt-3 text-sm text-gray-700">
                    <strong>Clinical Context:</strong> {selectedAlert.metadata.clinicalContext}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedAlert.status === 'active' && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Alert Actions</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Acknowledge Section */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Acknowledge Alert</h5>
                        <textarea
                          value={acknowledgmentNote}
                          onChange={(e) => setAcknowledgmentNote(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Add acknowledgment notes..."
                        />
                        <button
                          onClick={() => handleAcknowledgeAlert(selectedAlert.alertId, acknowledgmentNote)}
                          className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                        >
                          <FiCheckCircle className="h-4 w-4" />
                          <span>Acknowledge Alert</span>
                        </button>
                      </div>

                      {/* Escalate Section */}
                      {selectedAlert.severity === 'critical' && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Escalate Alert</h5>
                          <textarea
                            value={escalationReason}
                            onChange={(e) => setEscalationReason(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Reason for escalation..."
                          />
                          <button
                            onClick={() => handleEscalateAlert(selectedAlert.alertId, escalationReason)}
                            className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                          >
                            <FiPhone className="h-4 w-4" />
                            <span>Escalate to Level {selectedAlert.escalationLevel + 1}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Contact Actions */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Patient Contact</h5>
                      <div className="flex space-x-3">
                        <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                          <FiPhone className="h-4 w-4" />
                          <span>Call Patient</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                          <FiMail className="h-4 w-4" />
                          <span>Send Email</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                          <FiMessageSquare className="h-4 w-4" />
                          <span>Send Message</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowAlertModal(false);
                      setSelectedAlert(null);
                      setAcknowledgmentNote('');
                      setEscalationReason('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}