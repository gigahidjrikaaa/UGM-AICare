/**
 * Sidebar component to display all TCA-generated intervention plans
 * Shows in /aika page as a toggleable side panel
 * Enhanced with UGM design system colors and improved UX
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useInterventionPlans } from '@/hooks/useInterventionPlans';
import { PlanCard } from '@/components/resources/PlanCard';

interface InterventionPlansSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterventionPlansSidebar: React.FC<InterventionPlansSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const { data, isLoading, error, refetch } = useInterventionPlans(true); // activeOnly = true

  const activePlans = data?.plans || [];
  const totalPlans = data?.total || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Click to close (mobile/tablet) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-ugm-blue/20 backdrop-blur-sm z-[69] lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar Panel - Enhanced with UGM colors and higher z-index */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] lg:w-[420px] bg-white/95 backdrop-blur-xl border-l-2 border-ugm-blue/20 shadow-2xl z-[70] flex flex-col"
          >
            {/* Close Button - Side Mounted with improved styling */}
            <button
              onClick={onClose}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white/95 backdrop-blur-xl border-2 border-r-0 border-ugm-blue/20 rounded-l-xl shadow-xl hover:bg-white hover:border-ugm-blue/40 transition-all duration-200 p-3.5 text-ugm-blue hover:text-ugm-blue-dark group z-[70]"
              aria-label="Close plans sidebar"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            {/* Header - Enhanced with UGM gradient */}
            <div className="bg-gradient-to-br from-ugm-blue via-ugm-blue to-ugm-blue-light px-6 py-5 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-ugm-gold/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ugm-gold to-ugm-gold-light flex items-center justify-center shadow-xl flex-shrink-0">
                  <Sparkles className="w-7 h-7 text-ugm-blue" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">Rencana Saya</h2>
                  <p className="text-sm text-white/90">
                    {totalPlans} {totalPlans === 1 ? 'rencana' : 'rencana'} dari Aika
                  </p>
                </div>
              </div>
            </div>

            {/* Info Banner - Updated colors */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-ugm-blue/10">
              <p className="text-xs text-ugm-blue-dark leading-relaxed">
                💙 <strong className="font-bold">Rencana Support Coach:</strong> Langkah-langkah aksi yang dibuat saat Aika mendeteksi kamu butuh dukungan ekstra. Selesaikan langkah-langkah untuk melacak progresmu!
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-ugm-blue">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-10 h-10 mb-4" />
                  </motion.div>
                  <p className="text-sm font-semibold">Memuat rencana...</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-sm text-ugm-blue-dark font-bold mb-2">
                    Gagal memuat rencana
                  </p>
                  <p className="text-xs text-gray-600 mb-5 px-4">
                    {error.message || 'Terjadi kesalahan. Silakan coba lagi.'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-5 py-2.5 bg-gradient-to-r from-ugm-blue to-ugm-blue-light text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all shadow-md"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && activePlans.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-ugm-blue/10 to-ugm-gold/10 flex items-center justify-center mb-5 shadow-lg">
                    <Sparkles className="w-12 h-12 text-ugm-blue" />
                  </div>
                  <h3 className="text-lg font-bold text-ugm-blue-dark mb-3">
                    Belum Ada Rencana Aktif
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-sm mb-6">
                    Saat kamu berbagi momen stres atau distres dengan Aika, dia akan membuat rencana dukungan personal di sini untuk membantumu.
                  </p>
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200/60 shadow-sm">
                    <p className="text-xs text-amber-900 leading-relaxed">
                      💡 <strong className="font-bold">Tips:</strong> Coba katakan &quot;Aku stress dengan skripsi&quot; atau &quot;Aku merasa cemas hari ini&quot; untuk memicu rencana!
                    </p>
                  </div>
                </div>
              )}

              {/* Plans List */}
              {!isLoading && !error && activePlans.length > 0 && (
                <>
                  {activePlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} onUpdate={() => refetch()} />
                  ))}
                </>
              )}
            </div>

            {/* Footer - Enhanced with UGM colors */}
            <div className="px-6 py-4 border-t-2 border-ugm-blue/10 bg-gradient-to-r from-gray-50 to-blue-50/30">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white border-2 border-ugm-blue/30 rounded-xl text-sm font-semibold text-ugm-blue hover:bg-ugm-blue hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Rencana
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
