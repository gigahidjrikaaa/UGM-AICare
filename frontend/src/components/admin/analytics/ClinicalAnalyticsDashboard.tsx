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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <FiBarChart className="h-7 w-7 text-blue-600" />
              <span>Clinical Analytics</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Privacy-preserving clinical intelligence and treatment outcome analysis
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <FiCheckCircle className="h-4 w-4" />
              <span>Privacy Compliant</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              <FiShield className="h-4 w-4" />
              <span>Differential Privacy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ethics Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiInfo className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Clinical Intelligence Platform</div>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-0" aria-label="Analytics tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 py-4 px-6 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <div className={`text-xs mt-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
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
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-medium text-gray-900 mb-1">Privacy Protection</div>
            <ul className="space-y-1 text-xs">
              <li>• Differential privacy with ε-δ parameters</li>
              <li>• K-anonymity protection (k≥5)</li>
              <li>• Privacy budget monitoring</li>
              <li>• Consent-aware data processing</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">Clinical Standards</div>
            <ul className="space-y-1 text-xs">
              <li>• Evidence-based outcome analysis</li>
              <li>• Clinical significance testing (MCID, RCI)</li>
              <li>• Professional validation required</li>
              <li>• Standardized assessment instruments</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">System Compliance</div>
            <ul className="space-y-1 text-xs">
              <li>• HIPAA privacy compliance</li>
              <li>• Audit trail maintenance</li>
              <li>• Regular compliance monitoring</li>
              <li>• Transparent methodology</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Last system update: {new Date().toLocaleDateString()} • 
            Privacy framework: Differential Privacy v2.1 • 
            Clinical validation: Evidence-based standards
          </p>
        </div>
      </div>
    </div>
  );
}