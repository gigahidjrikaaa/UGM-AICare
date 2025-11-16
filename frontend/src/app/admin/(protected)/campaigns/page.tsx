'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { getCampaigns, deleteCampaign } from '@/services/adminCampaignApi';
import type {
  Campaign,
  CampaignStatus,
  CampaignPriority,
  CampaignFilters,
} from '@/types/admin/campaigns';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  TARGET_AUDIENCE_LABELS,
} from '@/types/admin/campaigns';
import { formatTargetAudience } from '@/lib/campaignUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CampaignFormModal,
  CampaignMetricsModal,
  CampaignHistoryModal,
  ExecuteCampaignModal,
  AICampaignModal,
} from '@/components/admin/campaigns';


export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    page_size: 20,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Fetch campaigns
  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => getCampaigns(filters),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setShowFormModal(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowFormModal(true);
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await deleteMutation.mutateAsync(campaignId);
    }
  };

  const handleViewMetrics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowMetricsModal(true);
  };

  const handleViewHistory = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowHistoryModal(true);
  };

  const handleExecuteCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowExecuteModal(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchQuery, page: 1 });
  };

  const handleFilterChange = (key: keyof CampaignFilters, value: string) => {
    setFilters({ ...filters, [key]: value || undefined, page: 1 });
  };

  const getStatusBadgeColor = (status: CampaignStatus) => {
    return CAMPAIGN_STATUS_COLORS[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority?: CampaignPriority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  if (error) {
    return (
      <div className="p-6 text-red-400">
        Error loading campaigns: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">TCA Outreach Management</h1>
          <p className="text-white/60 text-sm">
            Manage proactive Therapeutic Coach Agent (TCA) campaigns and interventions
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowAIModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Create with AI
          </button>
          <button
            onClick={handleCreateCampaign}
            className="px-6 py-3 bg-[#FFCA40] hover:bg-[#FFCA40]/90 text-[#00153a] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#FFCA40]/20 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create Campaign
          </button>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-[#FFCA40]" />
          <h2 className="text-lg font-semibold text-white">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
            />
          </form>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            aria-label="Filter by status"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
          >
            <option value="">All Statuses</option>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            aria-label="Filter by priority"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Target Audience Filter */}
          <select
            value={filters.target_audience || ''}
            onChange={(e) => handleFilterChange('target_audience', e.target.value)}
            aria-label="Filter by target audience"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
          >
            <option value="">All Audiences</option>
            {Object.entries(TARGET_AUDIENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Campaign List */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-[#FFCA40] rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-white/60">Loading campaigns...</p>
          </div>
        ) : !data || !data.items || data.items.length === 0 ? (
          <div className="p-12 text-center">
            <RocketLaunchIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No campaigns found</p>
            <button
              onClick={handleCreateCampaign}
              className="mt-4 px-4 py-2 bg-[#FFCA40] hover:bg-[#FFCA40]/90 text-[#00153a] font-semibold rounded-xl transition-all"
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Target Audience
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Last Executed
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data?.items.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleEditCampaign(campaign)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-white">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-sm text-white/60 mt-1 line-clamp-1">
                            {campaign.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusBadgeColor(
                          campaign.status
                        )}`}
                      >
                        {CAMPAIGN_STATUS_LABELS[campaign.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/80">
                      {formatTargetAudience(campaign.target_audience as unknown)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${getPriorityColor(campaign.priority)}`}>
                        {campaign.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {campaign.last_executed_at
                        ? new Date(campaign.last_executed_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {campaign.status === 'active' && (
                          <button
                            onClick={() => handleExecuteCampaign(campaign)}
                            className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                            title="Execute Campaign"
                          >
                            <PlayIcon className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewHistory(campaign)}
                          className="p-2 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors"
                          title="View History"
                        >
                          <ClockIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleViewMetrics(campaign)}
                          className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                          title="View Metrics"
                        >
                          <ChartBarIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          title="Delete Campaign"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > (filters.page_size || 20) && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-white/60">
              Showing {((filters.page || 1) - 1) * (filters.page_size || 20) + 1} to{' '}
              {Math.min((filters.page || 1) * (filters.page_size || 20), data.total)} of {data.total}{' '}
              campaigns
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={filters.page === 1}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={(filters.page || 1) * (filters.page_size || 20) >= data.total}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {showFormModal && (
        <CampaignFormModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowFormModal(false);
            setSelectedCampaign(null);
          }}
          onSuccess={() => {
            setShowFormModal(false);
            setSelectedCampaign(null);
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          }}
        />
      )}

      {showMetricsModal && selectedCampaign && (
        <CampaignMetricsModal
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.name}
          onClose={() => {
            setShowMetricsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}

      {showExecuteModal && selectedCampaign && (
        <ExecuteCampaignModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowExecuteModal(false);
            setSelectedCampaign(null);
          }}
          onSuccess={() => {
            setShowExecuteModal(false);
            setSelectedCampaign(null);
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
          }}
        />
      )}

      {showHistoryModal && selectedCampaign && (
        <CampaignHistoryModal
          campaign={selectedCampaign}
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}

      {showAIModal && (
        <AICampaignModal
          onClose={() => setShowAIModal(false)}
          onSuccess={async (campaignData) => {
            // Create campaign directly with AI-generated data
            try {
              const { createCampaign } = await import('@/services/adminCampaignApi');
              await createCampaign(campaignData);
              setShowAIModal(false);
              queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            } catch (error) {
              console.error('Failed to create AI campaign:', error);
            }
          }}
        />
      )}
    </div>
  );
}
