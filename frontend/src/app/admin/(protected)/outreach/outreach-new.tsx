'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayIcon,
  PencilSquareIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import {
  getSchedulerJobs,
  toggleJob,
  rescheduleJob,
  runJobNow,
  triggerUserCheckin,
  type SchedulerJob
} from '@/services/adminSchedulerApi';

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState<'automations' | 'checkins' | 'counselor-reminders'>('automations');
  
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['scheduler-jobs'],
    queryFn: getSchedulerJobs,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-6 md:p-10 space-y-8 text-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFCA40]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/10"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Outreach Hub
            </h1>
            <p className="text-white/60 mt-3 max-w-2xl text-lg">
              Manage proactive student check-ins, automated workflows, and system-wide reminders.
            </p>
          </div>
          <Link 
            href="/admin/campaigns"
            className="group relative flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-[#FFCA40] border border-white/10 hover:border-[#FFCA40]/50 rounded-2xl font-medium transition-all duration-300 backdrop-blur-md overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFCA40]/0 via-[#FFCA40]/10 to-[#FFCA40]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <SparklesIcon className="w-5 h-5" />
            Manage Campaigns
            <span className="transition-transform group-hover:translate-x-1 ml-1">→</span>
          </Link>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 overflow-x-auto pb-px hide-scrollbar">
          {[
            { id: 'automations', label: 'Automations', icon: ClockIcon },
            { id: 'checkins', label: 'Check-ins', icon: PaperAirplaneIcon },
            { id: 'counselor-reminders', label: 'Counselor Reminders', icon: UserGroupIcon }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-6 py-4 font-medium text-sm transition-colors duration-300 whitespace-nowrap flex items-center gap-2 ${
                  isActive 
                    ? 'text-[#FFCA40]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#FFCA40]' : 'text-white/40'}`} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFCA40] shadow-[0_-2px_10px_rgba(255,202,64,0.5)]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="pt-2 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'automations' && <AutomationsTab jobs={jobs} isLoading={isLoading} error={error} />}
              {activeTab === 'checkins' && <CheckinsTab />}
              {activeTab === 'counselor-reminders' && <CounselorRemindersTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AutomationsTab({ jobs, isLoading, error }: { jobs?: SchedulerJob[], isLoading: boolean, error: unknown }) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-[#FFCA40] rounded-full animate-spin"></div>
          <p className="text-white/50 text-sm font-medium animate-pulse">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-start gap-4 backdrop-blur-md">
        <ExclamationCircleIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-lg text-red-300">Failed to load scheduler jobs</h3>
          <p className="text-red-400/70 mt-1">Please try refreshing the page or check your connection.</p>
        </div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-32 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm shadow-xl">
        <CalendarDaysIcon className="w-20 h-20 text-white/20 mx-auto mb-6" />
        <h3 className="text-2xl font-bold mb-3 text-white">No Automations Found</h3>
        <p className="text-white/60 max-w-md mx-auto text-lg">
          There are currently no scheduled jobs configured in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <AnimatePresence>
        {jobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <JobCard job={job} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function JobCard({ job }: { job: SchedulerJob }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [hour, setHour] = useState<number | ''>('');
  const [minute, setMinute] = useState<number | ''>('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  
  const [runStatus, setRunStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [runMessage, setRunMessage] = useState('');

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleJob(job.id, enabled),
    onMutate: async (newEnabled) => {
      await queryClient.cancelQueries({ queryKey: ['scheduler-jobs'] });
      const previousJobs = queryClient.getQueryData<SchedulerJob[]>(['scheduler-jobs']);
      if (previousJobs) {
        queryClient.setQueryData<SchedulerJob[]>(['scheduler-jobs'], previousJobs.map(j => 
          j.id === job.id ? { ...j, enabled: newEnabled } : j
        ));
      }
      return { previousJobs };
    },
    onEr
