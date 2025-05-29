// frontend/src/components/journaling/JournalEntryModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api'; // Use your configured client
import { format, parseISO } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';
import { FiSave, FiLoader, FiX, FiMessageSquare, FiChevronDown } from 'react-icons/fi';
import ReflectionPointsPanel from './ReflectionPointsModal'; // Corrected import name
import { getActiveJournalPrompts, saveJournalEntry, getMyJournalReflections } from '@/services/api';
import type { JournalPromptResponse, JournalEntryItem, JournalReflectionPointResponse } from '@/types/api';
import { toast } from 'react-hot-toast';

interface JournalEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialDate?: string; // YYYY-MM-DD, defaults to today
}

export default function JournalEntryModal({
    isOpen,
    onClose,
    onSaveSuccess,
    initialDate,
}: JournalEntryModalProps) {
    const [entryDate, setEntryDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingEntry, setIsFetchingEntry] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [prompts, setPrompts] = useState<JournalPromptResponse[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
    const [isFetchingPrompts, setIsFetchingPrompts] = useState(false);
    
    const [reflectionPoints, setReflectionPoints] = useState<JournalReflectionPointResponse[]>([]);
    const [isFetchingReflections, setIsFetchingReflections] = useState(false);

    const fetchEntryForDate = useCallback(async (dateToFetch: string) => {
        setIsFetchingEntry(true);
        setError(null);
        try {
            const response = await apiClient.get<JournalEntryItem>(`/journal/${dateToFetch}`, {
                // Configure validateStatus to treat 404 as a non-error for this specific call
                validateStatus: function (status) {
                    return (status >= 200 && status < 300) || status === 404;
                }
            });

            if (response.status === 404) {
                setContent(''); // No entry for this date, clear content
                setSelectedPromptId(null); // Clear selected prompt
                toast("Journal is empty. Remember what you felt this day?", { duration: 4000, icon: '🤔', position: 'bottom-center' });
            } else if (response.status >= 200 && response.status < 300) {
                setContent(response.data.content);
                setSelectedPromptId(response.data.prompt?.id || null);
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }
        } catch (err: unknown) { 
            console.error("Error fetching journal entry (unexpected error):", err);
            setError("Failed to load existing entry.");
            toast.error("Failed to load existing entry.");
        } finally {
            setIsFetchingEntry(false);
        }
    }, []);

    const fetchPrompts = useCallback(async () => {
        setIsFetchingPrompts(true);
        try {
            const fetchedPrompts = await getActiveJournalPrompts();
            setPrompts(fetchedPrompts);
        } catch (err) {
            console.error("Error fetching prompts:", err);
            toast.error("Could not load journal prompts.");
        } finally {
            setIsFetchingPrompts(false);
        }
    }, []);

    const fetchReflectionPoints = useCallback(async () => {
        // No need to check for isOpen here if we always want to fetch when JournalEntryModal is open
        setIsFetchingReflections(true);
        try {
            const fetchedReflections = await getMyJournalReflections();
            setReflectionPoints(fetchedReflections);
        } catch (err) {
            console.error("Error fetching reflection points in component:", err);
        } finally {
            setIsFetchingReflections(false);
        }
    }, []);


    useEffect(() => {
        if (isOpen) {
            const dateToUse = initialDate || format(new Date(), 'yyyy-MM-dd');
            setEntryDate(dateToUse);
            fetchEntryForDate(dateToUse);
            if (prompts.length === 0) {
                fetchPrompts();
            }
            fetchReflectionPoints(); // Fetch reflections when modal opens
        } else {
            // Reset state when modal closes
            setContent('');
            setSelectedPromptId(null);
            setError(null);
            setReflectionPoints([]); 
        }
    }, [isOpen, initialDate, fetchEntryForDate, fetchPrompts, prompts.length, fetchReflectionPoints]);
    
    const handleSave = async () => {
        if (!content.trim()) {
            setError("Journal content cannot be empty.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await saveJournalEntry({
                entry_date: entryDate,
                content,
                prompt_id: selectedPromptId,
            });
            toast.success('Journal entry saved!');
            onSaveSuccess(); 
            fetchReflectionPoints(); 
        } catch (err: unknown) {
            console.error("Error saving journal entry:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to save entry. Please try again.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedPromptText = prompts.find(p => p.id === selectedPromptId)?.text;

    const showReflectionPanel = !isFetchingReflections && reflectionPoints.length > 0;

    return (
        <>
            <Transition appear show={isOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                            >
                            {/* Main Dialog Panel - Wider to accommodate side-by-side */}
                            <Dialog.Panel className={`w-full rounded-xl bg-[#0a2a6e]/90 border border-white/20 shadow-2xl text-white flex overflow-hidden ${showReflectionPanel ? 'max-w-5xl' : 'max-w-lg'}`}>
                                {/* Right Side: Reflection Points Panel (Conditional) */}
                                { (isFetchingReflections || reflectionPoints.length > 0) && (
                                    <div className="w-1/3 min-w-md bg-ugm-blue-dark/30 border-l border-white/10 overflow-y-auto max-h-[80vh]">
                                        <ReflectionPointsPanel
                                            reflectionPoints={reflectionPoints}
                                            entryDate={format(parseISO(entryDate), 'MMMM d, yyyy')}
                                            isLoading={isFetchingReflections}
                                            // You could add an onClose here if you want a dedicated close for this panel
                                            // e.g., onClose={() => setReflectionPoints([])} to hide it
                                        />
                                    </div>
                                )}
                                {/* Left Side: Journal Entry Form */}
                                <div className="flex-1 p-6 min-w-lg overflow-y-auto max-h-[80vh]">
                                    <Dialog.Title className="text-lg font-semibold text-[#FFCA40] flex justify-between items-center">
                                        Journal Entry for {format(parseISO(entryDate), 'MMMM d, yyyy')}
                                        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
                                            <FiX size={20} />
                                        </button>
                                    </Dialog.Title>
                                    <Dialog.Description className="mt-1 text-sm text-gray-300 mb-4">
                                        {isFetchingEntry ? "Loading entry..." : "Reflect on your day or use a prompt to guide your thoughts."}
                                    </Dialog.Description>

                                    {/* Prompt Selection */}
                                    <div className="mb-4">
                                        <label htmlFor="journal-prompt" className="block text-sm font-medium text-gray-300 mb-1">
                                            Choose a Prompt (Optional)
                                        </label>
                                        <div className="relative">
                                            <select
                                                id="journal-prompt"
                                                value={selectedPromptId || ""}
                                                onChange={(e) => setSelectedPromptId(e.target.value ? parseInt(e.target.value) : null)}
                                                disabled={isFetchingPrompts || isFetchingEntry}
                                                className="w-full bg-white/10 border border-white/20 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] appearance-none"
                                            >
                                                <option value="">-- Write freely --</option>
                                                {isFetchingPrompts && <option disabled>Loading prompts...</option>}
                                                {prompts.map(prompt => (
                                                    <option key={prompt.id} value={prompt.id}>
                                                        {prompt.category ? `[${prompt.category}] ` : ''}{prompt.text.substring(0, 70)}{prompt.text.length > 70 ? '...' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        </div>
                                        {selectedPromptText && (
                                            <div className="mt-2 p-3 bg-white/5 rounded-md border border-white/10">
                                                <p className="text-sm text-gray-300 italic">
                                                    <FiMessageSquare className="inline mr-2 mb-0.5 text-[#FFCA40]" />
                                                    {selectedPromptText}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <textarea
                                        rows={9} // Adjusted rows for potentially less vertical space
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder={selectedPromptId ? "Respond to the prompt above..." : "What's on your mind today?"}
                                        className="w-full bg-white/10 border border-white/20 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] placeholder-gray-500"
                                        disabled={isFetchingEntry || isLoading}
                                    />

                                    {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 rounded-md transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isLoading || isFetchingEntry}
                                            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center justify-center transition disabled:opacity-50"
                                        >
                                            {isLoading ? <FiLoader className="animate-spin mr-2" /> : <FiSave className="mr-2" />}
                                            Save Entry
                                        </button>
                                    </div>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}