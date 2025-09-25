'use client';

import { FiSearch } from 'react-icons/fi';

export type TabKey = 'overview' | 'monitoring' | 'engagement' | 'insights' | 'trends';

export interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface TabNavigationProps {
  tabs: Tab[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  searchQuery, 
  onSearchChange 
}) => (
  <div className="space-y-4">
    {/* Search Bar */}
    <div className="relative">
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
      <input
        type="text"
        placeholder="Search insights, metrics, or recommendations..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300"
      />
    </div>

    {/* Tab Navigation */}
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === tab.key
              ? 'bg-[#FFCA40] text-black'
              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/15'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>

    {/* Active Tab Description */}
    <div className="text-sm text-white/60">
      {tabs.find(tab => tab.key === activeTab)?.description}
    </div>
  </div>
);