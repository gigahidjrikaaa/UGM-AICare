// frontend/src/components/journaling/JournalEntryModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api'; // Use your configured client
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSave, FiLoader, FiXCircle } from 'react-icons/fi';

interface JournalEntryData {
    id?: number;
    entry_date: string; // yyyy-MM-dd
    content: string;
    created_at?: string;
    updated_at?: string;
}

interface JournalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void; // Callback to trigger refresh in parent
}

export default function JournalEntryModal({ isOpen, onClose, onSaveSuccess }: JournalEntryModalProps) {
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const [entryContent, setEntryContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false); // Loading state for fetching/saving
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false); // Separate loading state for initial fetch

    // Fetch today's entry when the modal opens
    const fetchTodaysEntry = useCallback(async () => {
        if (!isOpen) return; // Don't fetch if modal is closed

        setIsFetching(true);
        setError(null);
        setEntryContent(''); // Reset content
        try {
            // Use relative path with apiClient
            const response = await apiClient.get<JournalEntryData>(`/journal/${todayDateStr}`);
            setEntryContent(response.data.content); // Set content if entry exists
            console.log("Fetched today's entry:", response.data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err.response?.status === 404) {
                // No entry for today yet, fine to start blank
                console.log("No journal entry found for today yet.");
            } else {
                console.error("Error fetching today's journal entry:", err);
                setError("Failed to load today's journal entry data.");
            }
        } finally {
            setIsFetching(false);
        }
    }, [isOpen, todayDateStr]); // Dependency: isOpen, todayDateStr

    useEffect(() => {
        fetchTodaysEntry();
    }, [fetchTodaysEntry]); // Run fetch when modal opens

    // Handle saving (Create or Update for Today)
    const handleSave = async () => {
        if (!entryContent.trim()) {
            setError("Journal entry cannot be empty.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const payload = {
                entry_date: todayDateStr, // Always use today's date
                content: entryContent.trim(),
            };
            console.log("Saving today's journal payload:", JSON.stringify(payload, null, 2));
            // POST endpoint handles both create and update based on date+user
            await apiClient.post<JournalEntryData>('/journal/', payload); // Use relative path
            onSaveSuccess(); // Trigger parent refresh
            onClose(); // Close modal on success
        } catch (err) {
            console.error("Error saving today's journal entry:", err);
            setError("Failed to save journal entry.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={onClose} // Close on backdrop click
                >
                    {/* Modal Content Box */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-[#FFCA40]">
                                Journal Entry for {format(new Date(), 'MMMM d, yyyy')}
                            </h2>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" aria-label="Close modal">
                                <FiXCircle size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6">
                            {isFetching ? (
                                <div className="text-center py-10"><FiLoader className="animate-spin inline-block mr-2"/>Loading...</div>
                            ) : error ? (
                                <div className="text-center py-10 text-red-400">{error}</div>
                            ) : (
                                <textarea
                                    value={entryContent}
                                    onChange={(e) => setEntryContent(e.target.value)}
                                    placeholder="What's on your mind today?"
                                    className="w-full h-48 sm:h-64 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] transition text-white mb-4"
                                    disabled={isLoading}
                                />
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end p-4 bg-gray-900/50 border-t border-gray-700 space-x-3">
                             {error && !isLoading && <p className="text-red-400 text-sm mr-auto">{error}</p>}
                            <button
                                onClick={onClose}
                                type="button"
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition text-sm font-medium disabled:opacity-50"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading || isFetching || !entryContent.trim()}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium flex items-center disabled:opacity-50"
                            >
                                <FiSave className="mr-1.5"/> {isLoading ? "Saving..." : "Save Entry"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}