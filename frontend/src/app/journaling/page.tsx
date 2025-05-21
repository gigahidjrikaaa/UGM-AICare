// frontend/src/app/journaling/page.tsx
"use client";

import { useState, Suspense, useEffect, useCallback } from 'react'; // Added Suspense
import { motion } from 'framer-motion';
import ChatHistoryViewer from '@/components/features/journaling/ChatHistoryViewer'; // Create this component
import DailyJournal from '@/components/features/journaling/DailyJournal';       // Create this component
import AikaPageSkeleton from '@/components/ui/GlobalSkeleton'; 
import ActivityCalendar from '@/components/features/journaling/ActivityCalendar'; // <<< Import Calendar
import StreakDisplay from '@/components/features/journaling/StreakDisplay';
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

interface ActivitySummaryResponse {
    summary: ActivitySummary;
    currentStreak: number;
    longestStreak: number;
}

export default function JournalingPage() {
    const [activeTab, setActiveTab] = useState<JournalTab>('daily');
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date())); // State for calendar month
    const [activityData, setActivityData] = useState<ActivitySummary>({}); // State for calendar data
    const [isCalendarLoading, setIsCalendarLoading] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [longestStreak, setLongestStreak] = useState<number>(0);

    // Function to fetch activity data
    const fetchActivityData = useCallback(async (monthDate: Date) => {
        setIsCalendarLoading(true); // Set loading true when fetch starts
        setCalendarError(null);
        const monthStr = format(monthDate, 'yyyy-MM');
        try {
            // Fetch data using the updated response structure
            const response = await apiClient.get<ActivitySummaryResponse>(
                `/activity-summary/?month=${monthStr}` // Relative path
            );
            setActivityData(response.data.summary || {});
            setCurrentStreak(response.data.currentStreak || 0);   // Set current streak
            setLongestStreak(response.data.longestStreak || 0); // Set longest streak
        } catch (err) {
            console.error("Error fetching activity summary:", err);
            setCalendarError("Failed to load activity data.");
            setActivityData({});
            setCurrentStreak(0); // Reset streak on error
            setLongestStreak(0); // Reset streak on error
        } finally {
            setIsCalendarLoading(false); // Set loading false when fetch ends
        }
    }, []);

    // Fetch data when month changes
    useEffect(() => {
        fetchActivityData(currentMonth);
    }, [currentMonth, fetchActivityData]);

    return (
        <div className="bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white p-4 md:p-6 flex flex-col flex-1">
            {/* 
                Removed the explicit h-screen and overflow handling from the direct children of AppLayout.
                AppLayout should provide the main scroll container.
                The p-4 md:p-6 provides padding for the content within the page.
                flex flex-col flex-1 allows this page to take up available space if AppLayout uses flex.
            */}
            
            <h1 className="text-2xl font-bold mb-4 sm:mb-6"> {/* Adjusted margin */}
                <span className="text-[#FFCA40]">Aika</span> Journal
            </h1>

            {/* Two-column layout for Calendar and Descriptions */}
            <div className="flex flex-col md:flex-row gap-4 lg:gap-8 mb-4 sm:mb-6 items-center md:items-start">
                {/* Left Column: Calendar */}
                <div className="w-full md:w-1/2 md:flex-shrink-0"> {/* Calendar column takes its content's width on md+ */}
                    <div className="max-w-full mx-auto md:mx-0"> {/* Ensures calendar is centered on mobile, left-aligned on md+ */}
                        <ActivityCalendar
                            currentMonth={currentMonth}
                            activityData={activityData}
                            onMonthChange={setCurrentMonth}
                            isLoading={isCalendarLoading}
                        />
                        {calendarError && <p className='text-red-400 text-sm text-center -mt-4 mb-2'>{calendarError}</p>}
                    </div>
                </div>

                {/* Right Column: Descriptions */}
                <div className="w-full md:flex-1 text-sm text-gray-300 space-y-2 text-center md:text-left p-2 md:p-0">
                    <div className="p-4 bg-slate-700/30 backdrop-blur-md rounded-xl shadow-lg border border-slate-600/50">
                        <h2 className="text-lg font-semibold text-gray-100 mb-2">Your Activity Summary</h2>

                        <StreakDisplay
                            currentStreak={currentStreak}
                            longestStreak={longestStreak}
                            isLoading={isCalendarLoading}
                        />
                        
                        <div className="mt-3 space-y-1.5">
                            <p className="text-sm text-gray-300">
                                <span className="font-semibold text-green-400">📝 Journal Entries:</span> You&apos;ve written on {Object.values(activityData).filter(d => d.hasJournal).length} days this month.
                            </p>
                            <p className="text-sm text-gray-300">
                                <span className="font-semibold text-sky-400">💬 AI Conversations:</span> You&apos;ve chatted on {Object.values(activityData).filter(d => d.hasConversation).length} days this month.
                            </p>
                            <p className="text-sm text-gray-300">
                                <span className="font-semibold text-purple-400">🌟 Both Activities:</span> You&apos;ve done both on {Object.values(activityData).filter(d => d.hasJournal && d.hasConversation).length} days this month.
                            </p>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-100 mt-4 mb-2">Using Your Activity Calendar</h3>
                    <p>🗓️ <strong>Select a date:</strong> Click any day to write a new journal entry or review past ones.</p>
                    <p>↔️ <strong>Navigate months:</strong> Use the arrow buttons (‹ ›) next to the month/year to go back or forward in time.</p>
                    <p>💡 <strong>Activity markers:</strong> Dates with journal entries or AI conversations are highlighted, helping you track your engagement.</p>
                    <p className="mt-3 text-gray-400">Keep journaling to build your streak and gain deeper insights into your well-being!</p>
                </div>
            </div>

            <div className="mb-4 sm:mb-6 border-b border-white/10"> {/* Adjusted margin */}
                <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors duration-150 ${
                            activeTab === 'daily' ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]' : 'text-gray-400 hover:text-gray-200 hover:border-gray-500/50'
                        }`}
                    >
                        Daily Journal Entries
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors duration-150 ${
                            activeTab === 'history' ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]' : 'text-gray-400 hover:text-gray-200 hover:border-gray-500/50'
                        }`}
                    >
                        Previous Conversations
                    </button>
                </nav>
            </div>

            {/* Tab Content - flex-grow helps it take remaining vertical space if parent is flex-col */}
            <div className="flex-grow"> 
                <Suspense fallback={<AikaPageSkeleton />}>
                    {activeTab === 'daily' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} > {/* Removed h-full */}
                            <DailyJournal />
                        </motion.div>
                    )}
                    {activeTab === 'history' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} > {/* Removed h-full */}
                            <ChatHistoryViewer />
                        </motion.div>
                    )}
                </Suspense>
            </div>
        </div>
    );
}