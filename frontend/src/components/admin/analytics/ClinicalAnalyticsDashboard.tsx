/**
 * Clinical Analytics Dashboard
 * 
 * Complete integration of privacy-preserving clinical intelligence system:
 * - Treatment outcomes analysis
 * - Service utilization metrics  
 * - Privacy audit and compliance
 * - Clinical intelligence overview
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiActivity, 
  FiUsers,
  FiShield,
  FiBarChart,
  FiTrendingUp,
  FiCheckCircle,
  FiInfo,
  FiBell,
  FiUser,
  FiLock
} from 'react-icons/fi';

import { ClinicalAnalyticsOverview } from './ClinicalAnalyticsOverview';
import { TreatmentOutcomes } from './TreatmentOutcomes';
import { ServiceUtilization } from './ServiceUtilization';
import { PrivacyAudit } from './PrivacyAudit';
import { ClinicalOversight } from './ClinicalOversight';
import { ConsentManagement } from './ConsentManagement';
import { RealTimeClinicalAlerts } from './RealTimeClinicalAlerts';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Clinical Intelligence',
    icon: FiActivity,
    description: 'Executive summary of clinical analytics and outcomes'
  },
  {
    id: 'alerts',
    label: 'Clinical Alerts',
    icon: FiBell,
    description: 'Real-time monitoring for high-risk situations requiring immediate attention'
  },
  {
    id: 'treatment',
    label: 'Treatment Outcomes',
    icon: FiTrendingUp,
    description: 'Evidence-based treatment effectiveness analysis'
  },
  {
    id: 'utilization',
    label: 'Service Utilization',
    icon: FiUsers,
    description: 'Resource allocation and service optimization metrics'
  },
  {
    id: 'oversight',
    label: 'Clinical Oversight',
    icon: FiUser,
    description: 'Professional validation of AI-generated clinical insights'
  },
  {
    id: 'consent',
    label: 'Consent Management',
    icon: FiCheckCircle,
    description: 'Privacy-aware data processing and user consent oversight'
  },
  {
    id: 'privacy',
    label: 'Privacy Audit',
    icon: FiLock,
    description: 'Privacy protection compliance and differential privacy tracking'
  }
];

export function ClinicalAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ClinicalAnalyticsOverview />;
      case 'alerts':
        return <RealTimeClinicalAlerts />;
      case 'treatment':
        return <TreatmentOutcomes />;
      case 'utilization':
        return <ServiceUtilization />;
      case 'oversight':
        return <ClinicalOversight />;
      case 'consent':
        return <ConsentManagement />;
      case 'privacy':
        return <PrivacyAudit />;
      default:
        return <ClinicalAnalyticsOverview />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <div className="bg-[#FFCA40]/20 rounded-full p-2">
                <FiBarChart className="h-7 w-7 text-[#FFCA40]" />
              </div>
              <span>Clinical Analytics</span>
            </h1>
            <p className="text-white/70 mt-1">
              Privacy-preserving clinical intelligence and treatment outcome analysis
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-green-400 bg-green-500/20 px-3 py-1 rounded-full backdrop-blur-sm border border-green-400/30">
              <FiCheckCircle className="h-4 w-4" />
              <span>Privacy Compliant</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-[#FFCA40] bg-[#FFCA40]/20 px-3 py-1 rounded-full backdrop-blur-sm border border-[#FFCA40]/30">
              <FiShield className="h-4 w-4" />
              <span>Differential Privacy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ethics Notice */}
      <div className="bg-ugm-blue/20 backdrop-blur-md border border-ugm-blue/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="bg-[#FFCA40]/20 rounded-full p-1.5 mt-0.5">
            <FiInfo className="h-4 w-4 text-[#FFCA40]" />
          </div>
          <div className="text-sm text-white/90">
            <div className="font-semibold mb-2 text-[#FFCA40]">Clinical Intelligence Platform</div>
            <p>
              This system has been redesigned to replace surveillance-based analytics with privacy-preserving 
              clinical intelligence. All data is protected through differential privacy (ε-δ), k-anonymity, 
              and professional validation requirements. Treatment outcomes are analyzed using evidence-based 
              statistical methods with clinical significance testing.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
        <div className="border-b border-white/20">
          <nav className="flex space-x-0" aria-label="Analytics tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 py-4 px-6 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-[#FFCA40] bg-ugm-blue/30 border-b-2 border-[#FFCA40]'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-[#FFCA40]' : 'text-white/60'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <div className={`text-xs mt-1 ${isActive ? 'text-[#FFCA40]/80' : 'text-white/50'}`}>
                    {tab.description}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6"
        >
          {renderTabContent()}
        </motion.div>
      </div>

      {/* Footer Information */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 text-sm text-white/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="font-semibold text-[#FFCA40] mb-3 flex items-center space-x-2">
              <FiShield className="h-4 w-4" />
              <span>Privacy Protection</span>
            </div>
            <ul className="space-y-2 text-xs text-white/60">
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Differential privacy with ε-δ parameters</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>K-anonymity protection (k≥5)</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Privacy budget monitoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Consent-aware data processing</span>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[#FFCA40] mb-3 flex items-center space-x-2">
              <FiActivity className="h-4 w-4" />
              <span>Clinical Standards</span>
            </div>
            <ul className="space-y-2 text-xs text-white/60">
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Evidence-based outcome analysis</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Clinical significance testing (MCID, RCI)</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Professional validation required</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Standardized assessment instruments</span>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[#FFCA40] mb-3 flex items-center space-x-2">
              <FiCheckCircle className="h-4 w-4" />
              <span>System Compliance</span>
            </div>
            <ul className="space-y-2 text-xs text-white/60">
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>HIPAA privacy compliance</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Audit trail maintenance</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Regular compliance monitoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-[#FFCA40]/60 rounded-full"></div>
                <span>Transparent methodology</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/50">
            Last system update: {new Date().toLocaleDateString()} • 
            Privacy framework: Differential Privacy v2.1 • 
            Clinical validation: Evidence-based standards
          </p>
        </div>
      </div>
    </div>
  );
}