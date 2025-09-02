'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FiSearch as Search, 
  FiFilter as Filter, 
  FiDownload as Download, 
  FiEye as Eye, 
  FiEdit as Edit, 
  FiMail as Mail, 
  FiX as MailOff, 
  FiRefreshCw as RefreshCw, 
  FiUsers as Users, 
  FiActivity as Activity, 
  FiAward as Award 
} from '@/icons';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';

interface User {
  id: number;
  email: string | null;
  google_sub: string;
  wallet_address: string | null;
  sentiment_score: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  allow_email_checkins: boolean;
  role?: string;
  is_active?: boolean;
  created_at: string | null;
  updated_at?: string | null;
  total_journal_entries: number;
  total_conversations: number;
  total_badges: number;
  total_appointments: number;
  last_login: string | null;
  name?: string; // Added for therapist/admin
  phone?: string; // Added for therapist/admin
  date_of_birth?: string; // Added for therapist/admin
  specialization?: string; // Added for therapist
}

interface UserStats {
  total_users: number;
  active_users_30d: number;
  active_users_7d: number;
  new_users_today: number;
  avg_sentiment_score: number;
  total_journal_entries: number;
  total_conversations: number;
  total_badges_awarded: number;
}

interface UsersResponse {
  users: User[];
  total_count: number;
  stats: UserStats;
}

const ITEMS_PER_PAGE = 20;

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userLogs, setUserLogs] = useState<any[]>([]); // State for user logs

  // Fetch user logs
  const fetchUserLogs = useCallback(async (userId: number) => {
    try {
      const logs = await apiCall(`/api/v1/admin/users/${userId}/logs`);
      setUserLogs(logs);
    } catch (error) {
      console.error('Error fetching user logs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load user logs');
    }
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser.role === 'admin') {
      fetchUserLogs(selectedUser.id);
    }
  }, [selectedUser, fetchUserLogs]);

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        active_only: activeOnly.toString(),
        ...(searchTerm && { search: searchTerm })
      });

      const data: UsersResponse = await apiCall(`/api/v1/admin/users?${queryParams}`);
      setUsers(data.users);
      setStats(data.stats);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortOrder, activeOnly]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Toggle email checkins
  const toggleEmailCheckins = async (userId: number, enabled: boolean) => {
    try {
      await apiCall(`/api/v1/admin/users/${userId}/email-checkins?enabled=${enabled}`, {
        method: 'PUT'
      });

      toast.success(`Email checkins ${enabled ? 'enabled' : 'disabled'}`);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error toggling email checkins:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update email checkins');
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      await apiCall(`/api/v1/admin/users/${userId}/status?is_active=${isActive}`, {
        method: 'PUT'
      });

      toast.success(`User ${isActive ? 'activated' : 'deactivated'}`);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    }
  };

  // Update user role
  const updateUserRole = async (userId: number, newRole: string) => {
    try {
      await apiCall(`/api/v1/admin/users/${userId}/role?role=${newRole}`, {
        method: 'PUT'
      });

      toast.success(`User role updated to ${newRole}`);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  };

  // Delete user
  const deleteUser = async (userId: number, permanent: boolean = false) => {
    if (!confirm(`Are you sure you want to ${permanent ? 'permanently delete' : 'deactivate'} this user?`)) {
      return;
    }

    try {
      await apiCall(`/api/v1/admin/users/${userId}?permanent=${permanent}`, {
        method: 'DELETE'
      });

      toast.success(`User ${permanent ? 'permanently deleted' : 'deactivated'}`);
      fetchUsers(); // Refresh data
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  // Reset user password
  const resetUserPassword = async (userId: number) => {
    if (!confirm('Are you sure you want to generate a password reset for this user?')) {
      return;
    }

    try {
      const result = await apiCall<{ reset_token?: string; message: string }>(`/api/v1/admin/users/${userId}/reset-password`, {
        method: 'POST'
      });

      toast.success('Password reset token generated');
      
      // Show reset token (in production, this would be sent via email)
      if (result.reset_token) {
        prompt('Password reset token (copy this):', result.reset_token);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  // Export users data
  const exportUsers = async () => {
    try {
      // For now, we'll just download current visible data as CSV
      const csvContent = [
        ['ID', 'Email', 'Wallet Address', 'Sentiment Score', 'Current Streak', 'Longest Streak', 'Last Activity', 'Journal Entries', 'Conversations', 'Badges', 'Email Checkins'].join(','),
        ...users.map(user => [
          user.id,
          user.email || 'N/A',
          user.wallet_address || 'N/A',
          user.sentiment_score,
          user.current_streak,
          user.longest_streak,
          user.last_activity_date || 'N/A',
          user.total_journal_entries,
          user.total_conversations,
          user.total_badges,
          user.allow_email_checkins ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600 bg-green-50';
    if (score >= 0.3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return 'inactive';
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'active';
    if (days <= 30) return 'recent';
    return 'inactive';
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'recent': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-6 w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
                <div className="h-4 bg-white/20 rounded mb-2"></div>
                <div className="h-8 bg-white/20 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <div className="h-4 bg-white/20 rounded mb-4 w-1/3"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/20 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle changes in editable fields
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setEditedUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
  };

  // Save edited user data
  const handleSaveUser = async () => {
    if (!editedUser) return;

    try {
      setLoading(true);
      // Only send fields that are editable
      const payload: Partial<User> = {
        email: editedUser.email,
        wallet_address: editedUser.wallet_address,
        allow_email_checkins: editedUser.allow_email_checkins,
        role: editedUser.role,
        is_active: editedUser.is_active,
      };

      // Add new editable fields if they exist
      if (editedUser.name !== undefined) payload.name = editedUser.name;
      if (editedUser.phone !== undefined) payload.phone = editedUser.phone;
      if (editedUser.date_of_birth !== undefined) payload.date_of_birth = editedUser.date_of_birth;
      if (editedUser.specialization !== undefined) payload.specialization = editedUser.specialization;

      await apiCall(`/api/v1/admin/users/${editedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      toast.success('User updated successfully!');
      fetchUsers(); // Refresh data
      setSelectedUser(null); // Close modal
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Users className="mr-3 text-[#FFCA40]" />
            User Management
          </h1>
          <p className="text-gray-400 mt-1">Manage and monitor platform users</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters 
                ? 'bg-[#FFCA40] text-black' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={exportUsers}
            className="inline-flex items-center px-4 py-2 border border-white/20 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total_users.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-[#FFCA40]/20 rounded-lg">
                <Users className="h-6 w-6 text-[#FFCA40]" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {stats.new_users_today} new today
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Users (30d)</p>
                <p className="text-2xl font-bold text-white">{stats.active_users_30d.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {stats.active_users_7d} active this week
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Journal Entries</p>
                <p className="text-2xl font-bold text-white">{stats.total_journal_entries.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Edit className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {stats.total_conversations.toLocaleString()} conversations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Badges Awarded</p>
                <p className="text-2xl font-bold text-white">{stats.total_badges_awarded.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Avg sentiment: {stats.avg_sentiment_score.toFixed(2)}
            </p>
          </motion.div>
        </div>
      )}

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or wallet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  title="Sort by field"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                >
                  <option value="id" className="bg-gray-800">ID</option>
                  <option value="last_activity_date" className="bg-gray-800">Last Activity</option>
                  <option value="current_streak" className="bg-gray-800">Current Streak</option>
                  <option value="sentiment_score" className="bg-gray-800">Sentiment Score</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  title="Sort order"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                >
                  <option value="desc" className="bg-gray-800">Descending</option>
                  <option value="asc" className="bg-gray-800">Ascending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filter
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activeOnly"
                    checked={activeOnly}
                    onChange={(e) => setActiveOnly(e.target.checked)}
                    className="h-4 w-4 text-[#FFCA40] focus:ring-[#FFCA40] bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="activeOnly" className="ml-2 text-sm text-gray-300">
                    Active users only
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sentiment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Settings
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/20">
              {users.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedUser(user);
                    setEditedUser(user);
                    setIsEditing(false);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-[#FFCA40]">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {user.email || 'No email'}
                        </div>
                        <div className="text-sm text-gray-400">
                          ID: {user.id} • {user.wallet_address ? 'Has wallet' : 'No wallet'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(getActivityStatus(user.last_activity_date))}`}>
                        {getActivityStatus(user.last_activity_date)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Last: {formatDate(user.last_activity_date)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Streak: {user.current_streak} (max: {user.longest_streak})
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    <div className="space-y-1">
                      <div>📝 {user.total_journal_entries} entries</div>
                      <div>💬 {user.total_conversations} chats</div>
                      <div>🏆 {user.total_badges} badges</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(user.sentiment_score)}`}>
                      {(user.sentiment_score * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEmailCheckins(user.id, !user.allow_email_checkins);
                      }}
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        user.allow_email_checkins
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      {user.allow_email_checkins ? (
                        <>
                          <Mail className="h-3 w-3 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <MailOff className="h-3 w-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(user);
                          setEditedUser(user);
                          setIsEditing(false);
                        }}
                        className="text-[#FFCA40] hover:text-[#ffda63] transition-colors p-1 rounded-full hover:bg-white/10"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {/* Role Badge */}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-red-500/20 text-red-400' 
                          : user.role === 'therapist'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.role || 'user'}
                      </span>
                      
                      {/* Status Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUserStatus(user.id, !(user.is_active ?? true));
                        }}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active ?? true
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                        title={`${user.is_active ?? true ? 'Deactivate' : 'Activate'} User`}
                      >
                        {user.is_active ?? true ? 'Active' : 'Inactive'}
                      </button>
                      
                      {/* Actions Dropdown */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            e.stopPropagation();
                            const action = e.target.value;
                            e.target.value = ''; // Reset selection
                            
                            switch (action) {
                              case 'make-admin':
                                updateUserRole(user.id, 'admin');
                                break;
                              case 'make-therapist':
                                updateUserRole(user.id, 'therapist');
                                break;
                              case 'make-user':
                                updateUserRole(user.id, 'user');
                                break;
                              case 'reset-password':
                                resetUserPassword(user.id);
                                break;
                              case 'delete':
                                deleteUser(user.id, false);
                                break;
                              case 'delete-permanent':
                                deleteUser(user.id, true);
                                break;
                            }
                          }}
                          className="bg-white/10 text-white text-xs border border-white/20 rounded px-2 py-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
                          title="User Actions Menu"
                          aria-label="User Actions Menu"
                        >
                          <option value="">Actions</option>
                          <option value="make-admin">Make Admin</option>
                          <option value="make-therapist">Make Therapist</option>
                          <option value="make-user">Make User</option>
                          <option value="reset-password">Reset Password</option>
                          <option value="delete">Deactivate</option>
                          <option value="delete-permanent">Delete Permanently</option>
                        </select>
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-t border-white/20 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Showing{' '}
                  <span className="font-medium text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium text-white">
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium text-white">{totalCount}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/20 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/20 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-[#FFCA40]/20 border-[#FFCA40] text-[#FFCA40]'
                            : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/20 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/20 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">
                    {isEditing ? 'Edit User' : 'User Details'} - {selectedUser.email || `User ${selectedUser.id}`}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveUser}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-black bg-[#FFCA40] hover:bg-[#ffda63] transition-colors disabled:opacity-50"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Basic Information</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">User ID:</dt>
                        <dd className="text-sm text-white">{selectedUser.id}</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Email:</dt>
                        {isEditing ? (
                          <input
                            type="email"
                            name="email"
                            value={editedUser?.email || ''}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          />
                        ) : (
                          <dd className="text-sm text-white">{selectedUser.email || 'Not provided'}</dd>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Name:</dt>
                        {isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={editedUser?.name || ''}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          />
                        ) : (
                          <dd className="text-sm text-white">{selectedUser.name || 'Not provided'}</dd>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Phone:</dt>
                        {isEditing ? (
                          <input
                            type="text"
                            name="phone"
                            value={editedUser?.phone || ''}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          />
                        ) : (
                          <dd className="text-sm text-white">{selectedUser.phone || 'Not provided'}</dd>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Date of Birth:</dt>
                        {isEditing ? (
                          <input
                            type="date"
                            name="date_of_birth"
                            value={editedUser?.date_of_birth || ''}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          />
                        ) : (
                          <dd className="text-sm text-white">{selectedUser.date_of_birth || 'Not provided'}</dd>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Wallet Address:</dt>
                        {isEditing ? (
                          <input
                            type="text"
                            name="wallet_address"
                            value={editedUser?.wallet_address || ''}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs font-mono focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          />
                        ) : (
                          <dd className="text-xs text-white font-mono">
                            {selectedUser.wallet_address || 'Not connected'}
                          </dd>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Last Activity:</dt>
                        <dd className="text-sm text-white">{formatDate(selectedUser.last_activity_date)}</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Role:</dt>
                        {isEditing ? (
                          <select
                            name="role"
                            value={editedUser?.role || 'user'}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          >
                            <option value="user" className="bg-gray-800">User</option>
                            <option value="therapist" className="bg-gray-800">Therapist</option>
                            <option value="admin" className="bg-gray-800">Admin</option>
                          </select>
                        ) : (
                          <dd className="text-sm text-white">{selectedUser.role || 'user'}</dd>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Status:</dt>
                        {isEditing ? (
                          <select
                            name="is_active"
                            value={editedUser?.is_active ? 'true' : 'false'}
                            onChange={handleEditChange}
                            className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                          >
                            <option value="true" className="bg-gray-800">Active</option>
                            <option value="false" className="bg-gray-800">Inactive</option>
                          </select>
                        ) : (
                          <dd className="text-sm text-white">{selectedUser.is_active ? 'Active' : 'Inactive'}</dd>
                        )}
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Engagement Stats</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Current Streak:</dt>
                        <dd className="text-sm text-white">{selectedUser.current_streak} days</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Longest Streak:</dt>
                        <dd className="text-sm text-white">{selectedUser.longest_streak} days</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Sentiment Score:</dt>
                        <dd className={`text-sm font-medium ${getSentimentColor(selectedUser.sentiment_score)}`}>
                          {(selectedUser.sentiment_score * 100).toFixed(1)}%
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-gray-400">Email Checkins:</dt>
                        {isEditing ? (
                          <input
                            type="checkbox"
                            name="allow_email_checkins"
                            checked={editedUser?.allow_email_checkins || false}
                            onChange={handleEditChange}
                            className="h-4 w-4 text-[#FFCA40] focus:ring-[#FFCA40] bg-white/10 border-white/20 rounded"
                          />
                        ) : (
                          <dd className="text-sm text-white">
                            {selectedUser.allow_email_checkins ? 'Enabled' : 'Disabled'}
                          </dd>
                        )}
                      </div>
                    </dl>
                    {selectedUser.role === 'therapist' && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Therapist Information</h4>
                        <dl className="space-y-2">
                          <div className="flex justify-between items-center">
                            <dt className="text-sm text-gray-400">Specialization:</dt>
                            {isEditing ? (
                              <input
                                type="text"
                                name="specialization"
                                value={editedUser?.specialization || ''}
                                onChange={handleEditChange}
                                className="w-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40]"
                              />
                            ) : (
                              <dd className="text-sm text-white">{selectedUser.specialization || 'Not specified'}</dd>
                            )}
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedUser.role === 'admin' && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">User Activity Logs</h4>
                    <div className="bg-white/5 rounded-lg p-4 max-h-60 overflow-y-auto text-sm text-gray-300">
                      {userLogs.length > 0 ? (
                        userLogs.map((log, index) => (
                          <div key={index} className="mb-1">
                            <span className="font-medium text-white">{formatDate(log.timestamp)}:</span> {log.activity}
                          </div>
                        ))
                      ) : (
                        <p>No activity logs available for this user.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#FFCA40]/20 rounded-lg p-4 text-center border border-[#FFCA40]/30">
                    <div className="text-2xl font-bold text-[#FFCA40]">{selectedUser.total_journal_entries}</div>
                    <div className="text-sm text-gray-300">Journal Entries</div>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-4 text-center border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400">{selectedUser.total_conversations}</div>
                    <div className="text-sm text-gray-300">Conversations</div>
                  </div>
                  <div className="bg-yellow-500/20 rounded-lg p-4 text-center border border-yellow-500/30">
                    <div className="text-2xl font-bold text-yellow-400">{selectedUser.total_badges}</div>
                    <div className="text-sm text-gray-300">Badges Earned</div>
                  </div>
                  <div className="bg-purple-500/20 rounded-lg p-4 text-center border border-purple-500/30">
                    <div className="text-2xl font-bold text-purple-400">{selectedUser.total_appointments}</div>
                    <div className="text-sm text-gray-300">Appointments</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
