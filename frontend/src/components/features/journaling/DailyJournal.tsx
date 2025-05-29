// frontend/src/components/journaling/DailyJournal.tsx (Updated)
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api'; 
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { FiPlusSquare, FiBookOpen, FiLoader, FiMessageSquare } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import type { JournalEntryItem } from '@/types/api';

interface DailyJournalProps {
  // Called when DailyJournal wants to open the modal for a new or existing entry
  onOpenModalRequest: (date?: string) => void; 
  // A key that changes when the parent wants DailyJournal to refresh its entries
  refreshKey?: number; 
}

export default function DailyJournal({ onOpenModalRequest, refreshKey }: DailyJournalProps) {
    const [allEntries, setAllEntries] = useState<JournalEntryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllEntries = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<JournalEntryItem[]>('/journal/');
            response.data.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
            setAllEntries(response.data);
        } catch (err) {
            console.error("Error fetching all journal entries:", err);
            setError("Failed to load journal entries.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllEntries();
    }, [fetchAllEntries, refreshKey]); // Add refreshKey to dependencies

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                    <FiBookOpen className="mr-3 text-[#FFCA40]" /> Your Journal Entries
                </h2>
                <button
                    onClick={() => onOpenModalRequest(format(new Date(), 'yyyy-MM-dd'))}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium flex items-center transition"
                >
                    <FiPlusSquare className="mr-2" /> Add/Edit Today&apos;s Entry
                </button>
            </div>

            {isLoading && (
                 <div className="text-center py-10"><FiLoader className="animate-spin inline-block mr-2"/>Loading entries...</div>
            )}
            {error && !isLoading && (
                 <div className="text-center py-10 text-red-400">{error}</div>
            )}

            {!isLoading && !error && allEntries.length === 0 && (
                 <div className="text-center py-10 text-gray-400 italic">No journal entries found yet. Click the button above to add one for today!</div>
            )}
            {!isLoading && !error && allEntries.length > 0 && (
                <div className="space-y-4 max-h-[calc(100vh-20rem)] md:max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {allEntries.map((entry) => (
                        <div 
                            key={entry.id} 
                            className="bg-white/5 p-4 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => onOpenModalRequest(entry.entry_date)} // Use prop to request modal opening
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenModalRequest(entry.entry_date);}}
                        >
                            <h3 className="font-semibold text-[#FFCA40] mb-1">
                                {format(parseISO(entry.entry_date), 'EEEE, MMMM d, yyyy', { locale: id })}
                            </h3>
                            {entry.prompt && entry.prompt.text && (
                                <div className="mb-2 p-2 bg-white/5 rounded-md border border-white/10">
                                    <p className="text-xs text-gray-400 italic flex items-start">
                                        <FiMessageSquare className="inline mr-2 mt-0.5 text-[#FFCA40] flex-shrink-0" size={14} />
                                        <span>Prompt: {entry.prompt.text}</span>
                                    </p>
                                </div>
                            )}
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 line-clamp-3">
                                <ReactMarkdown components={{ p: 'span' }}>{entry.content}</ReactMarkdown>
                            </div>
                             <p className="text-xs text-gray-500 mt-2">
                                Last updated: {format(parseISO(entry.updated_at), 'Pp', { locale: id })}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* JournalEntryModal is now rendered and managed by the parent component */}
            {/* <JournalEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={handleModalSaveSuccess}
                initialDate={selectedDateForModal}
            /> */}
        </div>
    );
}