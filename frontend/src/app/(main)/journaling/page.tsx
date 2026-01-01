// frontend/src/app/journaling/page.tsx
"use client";

import { useState, Suspense, useEffect, useCallback } from 'react'; // Added Suspense
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ChatHistoryViewer from '@/components/features/journaling/ChatHistoryViewer'; // Create this component
import DailyJournal from '@/components/features/journaling/DailyJournal';       // Create this component
import { JournalingPageSkeleton } from '@/components/ui/GlobalSkeleton'; 
import ActivityCalendar from '@/components/features/journaling/ActivityCalendar'; // <<< Import Calendar
import StreakDisplay from '@/components/features/journaling/StreakDisplay';
import apiClient from '@/services/api'; // Import API client
import { startOfMonth, format } from 'date-fns';
import JournalEntryModal from '@/components/features/journaling/JournalEntryModal';
import toast from 'react-hot-toast';

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
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<JournalTab>('daily');
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date())); // State for calendar month
    const [activityData, setActivityData] = useState<ActivitySummary>({}); // State for calendar data
    const [isCalendarLoading, setIsCalendarLoading] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [longestStreak, setLongestStreak] = useState<number>(0);

    // State for JournalEntryModal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>(undefined);

    const [dailyJournalRefreshKey, setDailyJournalRefreshKey] = useState(0); // Key to force re-render of DailyJournal component

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
            toast.error("Failed to load activity data: " + (err instanceof Error ? err.message : "Unknown error"));
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

    // Unified handler to open the journal modal with a specific date string
    const handleOpenJournalModal = (dateString?: string) => {
        setSelectedDateForModal(dateString); // dateString is 'yyyy-MM-dd' or undefined
        setIsModalOpen(true);
    };

    const handleModalSaveSuccess = () => {
        setIsModalOpen(false);
        fetchActivityData(currentMonth); // Refresh calendar data
        setDailyJournalRefreshKey(prevKey => prevKey + 1); // Increment key to trigger DailyJournal refresh
    };

    // Initialize tab from URL on first render
    useEffect(() => {
        try {
            const tabParam = searchParams?.get('tab');
            if (tabParam === 'history' || tabParam === 'daily') {
                setActiveTab(tabParam as JournalTab);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setTabAndUrl = (tab: JournalTab) => {
        setActiveTab(tab);
        try {
            const current = new URLSearchParams(searchParams?.toString());
            current.set('tab', tab);
            router.replace(`/journaling?${current.toString()}`);
        } catch {}
    };

    return (
        <div className="bg-linear-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white pt-24 pb-6 px-4 md:px-6 flex flex-col flex-1">
            <h1 className="text-2xl font-bold mb-4 sm:mb-6"> {/* Adjusted margin */}
                <span className="text-[#FFCA40]">Aika</span> Journal
            </h1>

            {/* Two-column layout for Calendar and Descriptions */}
            <div className="flex flex-col md:flex-row gap-4 lg:gap-8 mb-4 sm:mb-6 items-center md:items-start">
                {/* Left Column: Calendar */}
                <div className="w-full md:w-1/2 md:shrink-0"> {/* Calendar column takes its content's width on md+ */}
                    <div className="max-w-full mx-auto md:mx-0"> {/* Ensures calendar is centered on mobile, left-aligned on md+ */}
                        <ActivityCalendar
                            currentMonth={currentMonth}
                            activityData={activityData}
                            onMonthChange={setCurrentMonth}
                            isLoading={isCalendarLoading}
                            // Update ActivityCalendar's onDateClick to use the new handler
                            onDateClick={(date) => handleOpenJournalModal(date ? format(date, 'yyyy-MM-dd') : undefined)}
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

                    <div className="mt-6 p-4 bg-slate-700/30 backdrop-blur-md rounded-xl shadow-lg border border-slate-600/50">
                        <h3 className="text-md font-semibold text-gray-100 mb-3">How to Use Your Journal</h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                                <span className="text-lg mr-2 mt-0.5">🗓️</span>
                                <div><strong>Select a Date:</strong> Click any day on the calendar to write or review an entry for that date.</div>
                            </li>
                            <li className="flex items-start">
                                <span className="text-lg mr-2 mt-0.5">↔️</span>
                                <div><strong>Navigate Months:</strong> Use the arrow buttons (‹ ›) by the month/year to explore different periods.</div>
                            </li>
                            <li className="flex items-start">
                                <span className="text-lg mr-2 mt-0.5">💡</span>
                                <div><strong>Activity Markers:</strong> Colored backgrounds on dates show your journal and chat activity, helping you track engagement.</div>
                            </li>
                        </ul>
                        <p className="mt-4 text-xs text-gray-400">Keep journaling to build your streak and gain deeper insights!</p>
                    </div>
                </div>
            </div>

            <div className="mb-4 sm:mb-6 border-b border-white/10"> {/* Adjusted margin */}
                <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
                    <button
                        onClick={() => setTabAndUrl('daily')}
                        className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors duration-150 ${
                            activeTab === 'daily' ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]' : 'text-gray-400 hover:text-gray-200 hover:border-gray-500/50'
                        }`}
                    >
                        Daily Journal Entries
                    </button>
                    <button
                        onClick={() => setTabAndUrl('history')}
                        className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors duration-150 ${
                            activeTab === 'history' ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]' : 'text-gray-400 hover:text-gray-200 hover:border-gray-500/50'
                        }`}
                    >
                        Previous Conversations
                    </button>
                </nav>
            </div>

            {/* Tab Content - flex-grow helps it take remaining vertical space if parent is flex-col */}
            <div className="grow"> 
                <Suspense fallback={<JournalingPageSkeleton />}>
                    {activeTab === 'daily' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
                            <DailyJournal 
                                // Pass the new unified handler to DailyJournal
                                onOpenModalRequest={handleOpenJournalModal}
                                refreshKey={dailyJournalRefreshKey} />
                        </motion.div>
                    )}
                    {activeTab === 'history' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
                            <ChatHistoryViewer />
                        </motion.div>
                    )}
                </Suspense>
            </div>
            {/* Conditionally render modal to ensure its internal state (like fetched entry) resets if initialDate changes */}
            {isModalOpen && (
                <JournalEntryModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSaveSuccess={handleModalSaveSuccess}
                    initialDate={selectedDateForModal}
                />
            )}
        </div>
    );
}
