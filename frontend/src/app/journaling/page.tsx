// frontend/src/app/journaling/page.tsx
"use client";

import { useState, Suspense, useEffect, useCallback } from 'react'; // Added Suspense
import { motion } from 'framer-motion';
import ChatHistoryViewer from '@/components/journaling/ChatHistoryViewer'; // Create this component
import DailyJournal from '@/components/journaling/DailyJournal';       // Create this component
import AikaPageSkeleton from '@/components/ui/GlobalSkeleton'; // Or a specific skeleton
import ActivityCalendar from '@/components/journaling/ActivityCalendar'; // <<< Import Calendar
import apiClient from '@/services/api'; // Import API client
import { startOfMonth, format } from 'date-fns';

type JournalTab = 'history' | 'daily';

// Define types from Calendar component
interface ActivityData {
    hasJournal: boolean;
    hasConversation: boolean;
}
interface ActivitySummary {
    [dateStr: string]: ActivityData;
}


export default function JournalingPage() {
    const [activeTab, setActiveTab] = useState<JournalTab>('daily');
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date())); // State for calendar month
    const [activityData, setActivityData] = useState<ActivitySummary>({}); // State for calendar data
    const [isCalendarLoading, setIsCalendarLoading] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);

    // Function to fetch activity data
    const fetchActivityData = useCallback(async (monthDate: Date) => {
        setIsCalendarLoading(true);
        setCalendarError(null);
        const monthStr = format(monthDate, 'yyyy-MM');
        try {
            const response = await apiClient.get<{ summary: ActivitySummary }>(
                `/activity-summary/?month=${monthStr}` // Use relative path and query param
            );
            setActivityData(response.data.summary || {});
        } catch (err) {
            console.error("Error fetching activity summary:", err);
            setCalendarError("Failed to load activity data.");
            setActivityData({}); // Clear data on error
        } finally {
            setIsCalendarLoading(false);
        }
    }, []);

    // Fetch data when month changes
    useEffect(() => {
        fetchActivityData(currentMonth);
    }, [currentMonth, fetchActivityData]);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
            <header className="p-4 border-b border-white/10 bg-[#001D58]/80 backdrop-blur-sm sticky top-0 z-10">
                <h1 className="text-xl font-bold">Journaling & History</h1>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="max-h-1/2 overflow-y-scroll mb-6">
                        {/* Calendar Component */}
                        <ActivityCalendar
                            currentMonth={currentMonth}
                            activityData={activityData}
                            onMonthChange={setCurrentMonth} // Pass setter function
                            isLoading={isCalendarLoading}
                        />
                        {calendarError && <p className='text-red-400 text-sm text-center -mt-4 mb-4'>{calendarError}</p>}
                    </div>
                    {/* Tab Navigation */}
                    <div className="mb-6 border-b border-white/10">
                        <nav className="flex space-x-4" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('daily')}
                                className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                                    activeTab === 'daily' ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Daily Journal Entries
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                                    activeTab === 'history' ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Previous Conversations
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <Suspense fallback={<AikaPageSkeleton />}>
                        {activeTab === 'daily' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <DailyJournal />
                            </motion.div>
                        )}
                        {activeTab === 'history' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <ChatHistoryViewer />
                            </motion.div>
                        )}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}