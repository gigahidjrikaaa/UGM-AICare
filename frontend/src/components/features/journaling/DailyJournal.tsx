// frontend/src/components/journaling/DailyJournal.tsx (Updated)
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api'; // Use your configured client
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { FiPlusSquare, FiBookOpen, FiLoader } from 'react-icons/fi';
import JournalEntryModal from './JournalEntryModal'; // Import the new modal component
import ReactMarkdown from 'react-markdown'; // For rendering content

interface JournalEntryData {
    id: number; // Now expect ID from the list endpoint
    entry_date: string; // yyyy-MM-dd
    content: string;
    created_at: string; // Expect timestamps from list
    updated_at: string;
}

export default function DailyJournal() {
    const [allEntries, setAllEntries] = useState<JournalEntryData[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Loading state for the list
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch all entries for the user
    const fetchAllEntries = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Use GET /journal/ to fetch all entries
            const response = await apiClient.get<JournalEntryData[]>('/journal/'); // Relative path
            // Sort entries by date, newest first
            response.data.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
            setAllEntries(response.data);
            console.log("Fetched all journal entries:", response.data);
        } catch (err) {
            console.error("Error fetching all journal entries:", err);
            setError("Failed to load journal entries.");
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies needed if it runs once on mount

    // Fetch entries when component mounts
    useEffect(() => {
        fetchAllEntries();
    }, [fetchAllEntries]);

    // Callback function for when the modal successfully saves
    const handleModalSaveSuccess = () => {
        setIsModalOpen(false); // Close the modal
        fetchAllEntries();    // Refresh the list
    };

    return (
        <div className="space-y-6">
            {/* Header and Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                    <FiBookOpen className="mr-3 text-[#FFCA40]" /> Your Journal Entries
                </h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium flex items-center transition"
                >
                    <FiPlusSquare className="mr-2" /> Add/Edit Today&apos;s Entry
                </button>
            </div>

            {/* Loading/Error State */}
            {isLoading && (
                 <div className="text-center py-10"><FiLoader className="animate-spin inline-block mr-2"/>Loading entries...</div>
            )}
            {error && !isLoading && (
                 <div className="text-center py-10 text-red-400">{error}</div>
            )}

            {/* List of Journal Entries */}
            {!isLoading && !error && allEntries.length === 0 && (
                 <div className="text-center py-10 text-gray-400 italic">No journal entries found yet. Click the button above to add one for today!</div>
            )}
            {!isLoading && !error && allEntries.length > 0 && (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {allEntries.map((entry) => (
                        <div key={entry.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                            <h3 className="font-semibold text-[#FFCA40] mb-1">
                                {format(parseISO(entry.entry_date), 'EEEE, MMMM d, yyyy', { locale: id })}
                            </h3>
                            {/* Render content safely using ReactMarkdown or similar */}
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 line-clamp-3"> {/* Limit lines displayed */}
                                <ReactMarkdown components={{ p: 'span' }}>{entry.content}</ReactMarkdown>
                            </div>
                             <p className="text-xs text-gray-500 mt-2">
                                Last updated: {format(parseISO(entry.updated_at), 'Pp', { locale: id })}
                            </p>
                             {/* Optional: Add a button/link to view full entry */}
                        </div>
                    ))}
                </div>
            )}

            {/* Render the Modal */}
            <JournalEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={handleModalSaveSuccess}
            />
        </div>
    );
}