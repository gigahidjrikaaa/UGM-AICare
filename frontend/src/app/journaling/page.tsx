// frontend/src/app/journaling/page.tsx
"use client";

import { useState, Suspense } from 'react'; // Added Suspense
import { motion } from 'framer-motion';
import ChatHistoryViewer from '@/components/journaling/ChatHistoryViewer'; // Create this component
import DailyJournal from '@/components/journaling/DailyJournal';       // Create this component
import AikaPageSkeleton from '@/components/ui/GlobalSkeleton'; // Or a specific skeleton

type JournalTab = 'history' | 'daily';

export default function JournalingPage() {
    const [activeTab, setActiveTab] = useState<JournalTab>('daily');

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white">
            {/* Header Placeholder (or use a proper layout) */}
            <header className="p-4 border-b border-white/10 bg-[#001D58]/80 backdrop-blur-sm sticky top-0 z-10">
                <h1 className="text-xl font-bold">Journaling</h1>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Optional Sidebar (if you want one specific to this page) */}
                {/* <aside className="w-64 bg-black/10 p-4 hidden md:block">...</aside> */}

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Tab Navigation */}
                    <div className="mb-6 border-b border-white/10">
                        <nav className="flex space-x-4" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('daily')}
                                className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                                    activeTab === 'daily'
                                        ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Daily Journal
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                                    activeTab === 'history'
                                        ? 'border-b-2 border-[#FFCA40] text-[#FFCA40]'
                                        : 'text-gray-400 hover:text-gray-200'
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