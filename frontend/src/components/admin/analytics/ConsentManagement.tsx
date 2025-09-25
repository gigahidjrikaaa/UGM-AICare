/**
 * Consent Management Integration
 * 
 * Privacy-aware data processing system that integrates user consent preferences
 * with clinical analytics to ensure ethical data use and user autonomy.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiShield,
  FiUsers,
  FiSettings,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiInfo,
  FiEye,
  FiToggleLeft,
  FiToggleRight,
  FiRefreshCw,
  FiDownload,
  FiMail
} from 'react-icons/fi';

// Note: Import services would come from actual implementation
// import { exportConsentData } from '@/services/clinicalAnalytics';

interface ConsentPreference {
  id: string;
  userId: number;
  category: 'treatment_analytics' | 'research_participation' | 'outcome_sharing' | 'service_optimization';
  granted: boolean;
  granularity: 'basic' | 'detailed' | 'anonymous_only';
  lastUpdated: string;
  expiryDate?: string;
  userEmail: string;
  specificPermissions: {
    dataAggregation: boolean;
    clinicalInsights: boolean;
    treatmentRecommendations: boolean;
    riskAssessment: boolean;
    anonymousResearch: boolean;
  };
  dataRetentionPreference: '1year' | '2years' | '5years' | 'indefinite';
  withdrawalRequested?: boolean;
  withdrawalDate?: string;
}

interface ConsentStatistics {
  totalUsers: number;
  consentedUsers: number;
  consentRate: number;
  categoryBreakdown: {
    treatment_analytics: { granted: number; total: number };
    research_participation: { granted: number; total: number };
    outcome_sharing: { granted: number; total: number };
    service_optimization: { granted: number; total: number };
  };
  recentWithdrawals: number;
  expiringSoon: number;
}

interface ConsentManagementProps {
  className?: string;
}

export function ConsentManagement({ className = '' }: ConsentManagementProps) {
  const [consentData, setConsentData] = useState<ConsentPreference[]>([]);
  const [statistics, setStatistics] = useState<ConsentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  
  // Management states
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentPreference | null>(null);

  useEffect(() => {
    loadConsentData();
  }, []);

  const loadConsentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration - in real implementation, this would call an API
      const mockConsentData: ConsentPreference[] = [
        {
          id: 'consent_001',
          userId: 1,
          category: 'treatment_analytics',
          granted: true,
          granularity: 'detailed',
          lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          userEmail: 'john.doe@example.com',
          specificPermissions: {
            dataAggregation: true,
            clinicalInsights: true,
            treatmentRecommendations: true,
            riskAssessment: true,
            anonymousResearch: false
          },
          dataRetentionPreference: '2years'
        },
        {
          id: 'consent_002',
          userId: 2,
          category: 'research_participation',
          granted: false,
          granularity: 'basic',
          lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          userEmail: 'jane.smith@example.com',
          specificPermissions: {
            dataAggregation: false,
            clinicalInsights: false,
            treatmentRecommendations: false,
            riskAssessment: true,
            anonymousResearch: true
          },
          dataRetentionPreference: '1year',
          withdrawalRequested: true,
          withdrawalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'consent_003',
          userId: 3,
          category: 'service_optimization',
          granted: true,
          granularity: 'anonymous_only',
          lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          userEmail: 'alex.wilson@example.com',
          specificPermissions: {
            dataAggregation: true,
            clinicalInsights: false,
            treatmentRecommendations: false,
            riskAssessment: false,
            anonymousResearch: true
          },
          dataRetentionPreference: '1year'
        }
      ];

      const mockStatistics: ConsentStatistics = {
        totalUsers: 1247,
        consentedUsers: 892,
        consentRate: 71.5,
        categoryBreakdown: {
          treatment_analytics: { granted: 734, total: 1247 },
          research_participation: { granted: 423, total: 1247 },
          outcome_sharing: { granted: 567, total: 1247 },
          service_optimization: { granted: 892, total: 1247 }
        },
        recentWithdrawals: 23,
        expiringSoon: 67
      };

      setConsentData(mockConsentData);
      setStatistics(mockStatistics);
    } catch (err) {
      console.error('Error loading consent data:', err);
      setError('Error loading consent management data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    try {
      // In real implementation, this would call an API
      console.log(`Performing ${bulkAction} on users:`, selectedUsers);
      
      // Reset selections
      setSelectedUsers([]);
      setBulkAction('');
      
      // Reload data
      await loadConsentData();
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError('Error performing bulk action');
    }
  };

  const handleExportConsent = async () => {
    try {
      // Mock export functionality - in real implementation, this would call an API
      console.log('Consent data exported successfully');
      // const response = await exportConsentData();
      // if (response.success) { ... }
    } catch (err) {
      console.error('Error exporting consent data:', err);
      setError('Error exporting consent data');
    }
  };

  const getConsentStatusColor = (granted: boolean, withdrawalRequested?: boolean) => {
    if (withdrawalRequested) return 'bg-red-100 text-red-800';
    return granted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'treatment_analytics': return <FiShield className="h-4 w-4" />;
      case 'research_participation': return <FiUsers className="h-4 w-4" />;
      case 'outcome_sharing': return <FiEye className="h-4 w-4" />;
      case 'service_optimization': return <FiSettings className="h-4 w-4" />;
      default: return <FiInfo className="h-4 w-4" />;
    }
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30 && daysDiff > 0;
  };

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
              <h3 className="text-red-800 font-medium">Error Loading Consent Management</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={loadConsentData}
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
              <FiShield className="h-5 w-5 text-green-600" />
              <span>Consent Management</span>
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Privacy-aware data processing and user consent oversight
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportConsent}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FiDownload className="h-4 w-4" />
              <span>Export Data</span>
            </button>
            <button
              onClick={loadConsentData}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FiRefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalUsers.toLocaleString()}</p>
              </div>
              <FiUsers className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Registered platform users</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consent Rate</p>
                <p className="text-2xl font-bold text-green-600">{statistics.consentRate}%</p>
              </div>
              <FiCheck className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">{statistics.consentedUsers.toLocaleString()} users consented</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Withdrawals</p>
                <p className="text-2xl font-bold text-red-600">{statistics.recentWithdrawals}</p>
              </div>
              <FiX className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.expiringSoon}</p>
              </div>
              <FiAlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Within 30 days</p>
          </motion.div>
        </div>
      )}

      {/* Category Breakdown */}
      {statistics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Consent by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(statistics.categoryBreakdown).map(([category, data]) => {
              const rate = (data.granted / data.total) * 100;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category)}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.round(rate)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{data.granted} consented</span>
                    <span>{rate.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consent Records */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Consent Records</h3>
            
            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-3">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  aria-label="Select bulk action"
                  title="Select bulk action for selected users"
                >
                  <option value="">Select Action</option>
                  <option value="send_reminder">Send Renewal Reminder</option>
                  <option value="export_selected">Export Selected</option>
                  <option value="bulk_update">Bulk Update Settings</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply ({selectedUsers.length})
                </button>
              </div>
            )}
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              aria-label="Filter by consent status"
              title="Filter consent records by status"
            >
              <option value="all">All Status</option>
              <option value="granted">Granted</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="pending_renewal">Pending Renewal</option>
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              aria-label="Filter by consent category"
              title="Filter consent records by category"
            >
              <option value="all">All Categories</option>
              <option value="treatment_analytics">Treatment Analytics</option>
              <option value="research_participation">Research Participation</option>
              <option value="outcome_sharing">Outcome Sharing</option>
              <option value="service_optimization">Service Optimization</option>
            </select>
            
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              aria-label="Filter by expiry status"
              title="Filter consent records by expiry status"
            >
              <option value="all">All Expiry</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="no_expiry">No Expiry</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === consentData.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(consentData.map(c => c.userId));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300"
                    aria-label="Select all consent records"
                    title="Select or deselect all consent records"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Granularity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consentData.map((consent) => (
                <tr key={consent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(consent.userId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, consent.userId]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== consent.userId));
                        }
                      }}
                      className="rounded border-gray-300"
                      aria-label={`Select consent record for user ${consent.userId}`}
                      title={`Select consent record for ${consent.userEmail}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          User #{consent.userId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {consent.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(consent.category)}
                      <span className="text-sm text-gray-900 capitalize">
                        {consent.category.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getConsentStatusColor(consent.granted, consent.withdrawalRequested)}`}>
                      {consent.withdrawalRequested ? 'Withdrawal Requested' : consent.granted ? 'Granted' : 'Not Granted'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {consent.granularity.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {consent.expiryDate ? (
                      <div className="text-sm">
                        <div className={`${isExpiringSoon(consent.expiryDate) ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                          {new Date(consent.expiryDate).toLocaleDateString()}
                        </div>
                        {isExpiringSoon(consent.expiryDate) && (
                          <div className="text-xs text-orange-600">Expiring soon</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No expiry</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => {
                        setSelectedConsent(consent);
                        setShowConsentModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                    <button 
                      className="text-gray-600 hover:text-gray-800"
                      title="Send reminder email"
                      aria-label={`Send reminder email to ${consent.userEmail}`}
                    >
                      <FiMail className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consent Detail Modal */}
      {showConsentModal && selectedConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Consent Details</h3>
                <button
                  onClick={() => {
                    setShowConsentModal(false);
                    setSelectedConsent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close consent details modal"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">{selectedConsent.userEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedConsent.category.replace('_', ' ')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Specific Permissions</label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(selectedConsent.specificPermissions).map(([permission, granted]) => (
                      <div key={permission} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{permission.replace(/([A-Z])/g, ' $1').trim()}</span>
                        {granted ? (
                          <FiToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <FiToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data Retention</label>
                    <p className="text-sm text-gray-900">{selectedConsent.dataRetentionPreference.replace(/(\d+)/, '$1 ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="text-sm text-gray-900">{new Date(selectedConsent.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>

                {selectedConsent.withdrawalRequested && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <FiAlertTriangle className="h-5 w-5 text-red-600" />
                      <h4 className="text-red-800 font-medium">Withdrawal Requested</h4>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      User requested withdrawal on {selectedConsent.withdrawalDate && new Date(selectedConsent.withdrawalDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
                <button
                  onClick={() => {
                    setShowConsentModal(false);
                    setSelectedConsent(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  Send Renewal Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}