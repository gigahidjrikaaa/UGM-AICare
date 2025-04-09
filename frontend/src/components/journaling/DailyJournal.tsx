// frontend/src/components/journaling/DailyJournal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Or your API client
import { format, parseISO, isValid } from 'date-fns';
import { FiSave, FiEdit2, FiTrash2, FiLoader } from 'react-icons/fi';

interface JournalEntryData {
    id?: number;
    entry_date: string; // YYYY-MM-DD
    content: string;
    created_at?: string;
    updated_at?: string;
}

export default function DailyJournal() {
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [entryContent, setEntryContent] = useState<string>('');
    const [currentEntry, setCurrentEntry] = useState<JournalEntryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Start in view mode if entry exists
    const [error, setError] = useState<string | null>(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    // Fetch entry for the selected date
    const fetchEntry = useCallback(async (dateStr: string) => {
        setIsLoading(true);
        setError(null);
        setCurrentEntry(null); // Reset
        setEntryContent('');    // Reset
        setIsEditing(false);   // Reset
        try {
            // Use GET /journal/{entry_date_str}
            const response = await axios.get<JournalEntryData>(`<span class="math-inline">\{baseUrl\}/api/v1/journal/</span>{dateStr}`);
            setCurrentEntry(response.data);
            setEntryContent(response.data.content);
        } catch (err: any) {
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                // No entry for this date, allow creation
                setIsEditing(true); // Start editing mode for new entry
            } else {
                console.error("Error fetching journal entry:", err);
                setError("Failed to load journal entry for this date.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl]);

    // Fetch entry when component mounts or date changes
    useEffect(() => {
        fetchEntry(selectedDate);
    }, [selectedDate, fetchEntry]);

    // Handle saving (Create or Update)
    const handleSave = async () => {
         if (!entryContent.trim()) {
             setError("Journal entry cannot be empty.");
             return;
         }
        setIsLoading(true);
        setError(null);
        try {
            const payload = {
                entry_date: selectedDate,
                content: entryContent.trim(),
            };
             // POST endpoint handles both create and update
            const response = await axios.post<JournalEntryData>(`${baseUrl}/api/v1/journal/`, payload);
            setCurrentEntry(response.data); // Update current entry state
            setEntryContent(response.data.content);
            setIsEditing(false); // Exit editing mode
        } catch (err) {
             console.error("Error saving journal entry:", err);
             setError("Failed to save journal entry.");
        } finally {
             setIsLoading(false);
        }
    };

    // Allow editing
    const handleEdit = () => {
        setIsEditing(true);
    };

    return (
        <div className="bg-white/5 p-4 sm:p-6 rounded-lg border border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-lg font-semibold text-white">Daily Journal</h2>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')} // Prevent future dates
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
            </div>

            {isLoading ? (
                 <div className="text-center py-10"><FiLoader className="animate-spin inline-block mr-2"/>Loading entry...</div>
            ) : error ? (
                 <div className="text-center py-10 text-red-400">{error}</div>
            ) : (
                <div>
                    {isEditing ? (
                        // Editing Mode
                        <textarea
                            value={entryContent}
                            onChange={(e) => setEntryContent(e.target.value)}
                            placeholder={`What's on your mind today, ${format(parseISO(selectedDate), 'MMMM d') }?`}
                            className="w-full h-64 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] transition text-white mb-4"
                            disabled={isLoading}
                        />
                    ) : (
                        // Viewing Mode
                        <div className="prose prose-invert prose-sm max-w-none bg-gray-700/50 p-4 rounded-lg min-h-[16rem] whitespace-pre-wrap border border-gray-600 mb-4">
                            {entryContent || <p className="italic text-gray-400">No entry for this date.</p>}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3">
                        {isEditing ? (
                            <button
                                onClick={handleSave}
                                disabled={isLoading || !entryContent.trim()}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium flex items-center disabled:opacity-50"
                            >
                                <FiSave className="mr-1.5"/> {isLoading ? "Saving..." : "Save Entry"}
                            </button>
                        ) : (
                            <button
                                onClick={handleEdit}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium flex items-center"
                            >
                                <FiEdit2 className="mr-1.5"/> {entryContent ? "Edit Entry" : "Create Entry"}
                            </button>
                        )}
                         {/* Optional Delete Button */}
                         {/* {!isEditing && currentEntry && (
                             <button className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium flex items-center"><FiTrash2 className="mr-1.5"/> Delete</button>
                         )} */}
                    </div>
                </div>
            )}
        </div>
    );
}