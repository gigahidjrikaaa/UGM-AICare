/**
 * Support Coach Agent (SCA) Management Page
 * 
 * Purpose: Monitor and analyze SCA intervention plan effectiveness
 * Features:
 * - List all intervention plans across users (privacy-preserving)
 * - Analytics dashboard (completion rates, engagement metrics)
 * - User progress tracking
 * - CBT module usage statistics
 * 
 * User Role: Admin only
 */

'use client';

import { useState } from 'react';
import { SCAAnalyticsOverview } from './components/SCAAnalyticsOverview';
import { InterventionPlansList } from './components/InterventionPlansList';
import { UserProgressTable } from './components/UserProgressTable';
import { CBTModuleUsage } from './components/CBTModuleUsage';
import { useSCAData } from './hooks/useSCAData';

type TabType = 'overview' | 'plans' | 'users' | 'modules';

export default function SupportCoachPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeframeDays, setTimeframeDays] = useState(30);
  
  const { analytics, loading: analyticsLoading } = useSCAData.useAnalytics(timeframeDays);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <svg className="h-8 w-8 text-[#FFCA40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Support Coach Agent (SCA)
            </h1>
            <p className="text-white/60 text-sm">
              Monitor intervention plans and analyze coaching effectiveness
            </p>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-1">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeframeDays(days)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  timeframeDays === days
                    ? 'bg-[#FFCA40] text-[#001d58]'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1.5">
          <div className="flex gap-1">
            {[
              { id: 'overview' as TabType, label: 'Analytics Overview', icon: '📊' },
              { id: 'plans' as TabType, label: 'Intervention Plans', icon: '📋' },
              { id: 'users' as TabType, label: 'User Progress', icon: '👥' },
              { id: 'modules' as TabType, label: 'CBT Modules', icon: '🧠' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#FFCA40] text-[#001d58] shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <SCAAnalyticsOverview 
              analytics={analytics} 
              loading={analyticsLoading}
              timeframeDays={timeframeDays}
            />
          )}
          
          {activeTab === 'plans' && (
            <InterventionPlansList />
          )}
          
          {activeTab === 'users' && (
            <UserProgressTable />
          )}
          
          {activeTab === 'modules' && (
            <CBTModuleUsage timeframeDays={timeframeDays} />
          )}
        </div>

        {/* Help Text */}
        <div className="bg-[#FFCA40]/10 backdrop-blur-sm border border-[#FFCA40]/30 rounded-xl p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-[#FFCA40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-2">
                About Support Coach Agent
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                The Support Coach Agent (SCA) generates personalized intervention plans using CBT techniques. 
                This dashboard helps you monitor plan effectiveness, track user engagement, and identify 
                which therapeutic approaches work best. All user data is anonymized for privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
