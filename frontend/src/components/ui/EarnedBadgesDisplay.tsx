"use client";
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api';
import Image from 'next/image';
import { FiLoader, FiAward, FiHelpCircle, FiRefreshCw } from 'react-icons/fi';
import { Tooltip } from '@mui/material';
import toast from 'react-hot-toast';

// Import from the new constants file
import { getIpfsUrl, badgeMetadataMap, getBadgeMeta } from '@/lib/badgeConstants';
import InteractiveBadgeCard from '@/components/ui/InteractiveBadgeCard';

// --- Define EDUChain Testnet Explorer ---
const EDUCHAIN_TESTNET_EXPLORER_BASE_URL = "https://edu-chain-testnet.blockscout.com";

interface EarnedBadge {
    badge_id: number;
    awarded_at: string;
    transaction_hash: string;
    contract_address: string;
    name?: string;
    description?: string;
    image_url?: string;
    attributes?: {
        trait_type: string;
        value: string | number;
        display_type?: string;
    }[];
}

interface EarnedBadgeInfo { 
    badge_id: number; 
    awarded_at: string; 
    transaction_hash: string; 
    contract_address: string;
}

interface SyncAchievementsResponse { 
    message: string; 
    newly_awarded_badges: EarnedBadgeInfo[]; 
}

export default function EarnedBadgesDisplay() {
    const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);    // State to hold the badges
    const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<number>>(new Set()); // State to hold the IDs of the badges
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Function to fetch badges - now callable manually for refresh
    const fetchBadges = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<EarnedBadge[]>('/profile/my-badges');
            
            const processedBadges: EarnedBadge[] = response.data.map(badgeInfo => {
                const meta = getBadgeMeta(badgeInfo.badge_id);
                return {
                    ...badgeInfo,
                    name: meta.name,
                    description: meta.description,
                    image_url: getIpfsUrl(meta.image), // Assuming meta.image is the CID
                };
            });
            setEarnedBadges(processedBadges);
            setEarnedBadgeIds(new Set(processedBadges.map(badge => badge.badge_id)));
        } catch (err) {
            console.error("Error fetching earned badges:", err);
            setError("Could not load earned badges.");
             // Clear badges on error
            setEarnedBadges([]);
            setEarnedBadgeIds(new Set());
        } finally {
            setIsLoading(false);
        }
    }, []);

    
    // --- Sync Achievements function moved from ProfilePage ---
    const handleSyncAchievements = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncError(null);
        const toastId = toast.loading("Checking for new badges...");
        
        try {
            const response = await apiClient.post<SyncAchievementsResponse>('/profile/sync-achievements'); // Use correct endpoint
            toast.dismiss(toastId);

            const newBadges = response.data.newly_awarded_badges || [];
            if (newBadges.length > 0) {
                toast.success(`Unlocked ${newBadges.length} new badge(s)!`, { duration: 4000 });
                newBadges.forEach((badge, index) => {
                    const meta = getBadgeMeta(badge.badge_id);
                    setTimeout(() => {
                         toast.success(<span>Badge Unlocked: <strong>{meta.name}</strong></span>, { icon: '🎉', duration: 5000 });
                    }, index * 500);
                });
                // --- Trigger a refresh of the displayed badges ---
                await fetchBadges(); // Re-fetch the badge list
                // ----------------------------------------------
            } else {
                toast.success("Achievements up to date!", { icon: '👍' });
            }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.dismiss(toastId);
            const errorMsg = err.response?.data?.detail || "Failed to sync achievements.";
            console.error("Error syncing achievements:", err);
            setSyncError(errorMsg); // Store error to display if needed
            toast.error(errorMsg);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, fetchBadges]); // Include fetchBadges in dependencies
    
    // Initial sync on component mount
    useEffect(() => {
        fetchBadges(); // Load current badges when component mounts
        handleSyncAchievements(); // Sync achievements on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchBadges]); // Include fetchBadges as a dependency


    // --- Loading and Error states ---
    if (isLoading) {
        // Improved skeleton for badges
        return (
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10 animate-pulse">
                 <h3 className="font-semibold mb-3 text-lg h-6 bg-gray-700 rounded w-1/3"></h3>
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                     {/* Render placeholders based on the total number of defined badges */}
                     {Object.keys(badgeMetadataMap).map((id) => (
                         <div key={`skel-${id}`} className="flex flex-col items-center p-2">
                             <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-1 bg-gray-700"></div>
                             <div className="h-3 w-16 sm:w-20 bg-gray-700 rounded mt-1"></div>
                         </div>
                     ))}
                 </div>
             </div>
        );
    }
    if (error) return <div className="p-4 text-center text-red-400">{error}</div>;

    // --- Render All Badge Slots ---
    return (
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className='flex items-center justify-between mb-2'>
                <h2 className="font-semibold text-xl text-white flex items-center">
                    <FiAward className="mr-2 text-[#FFCA40]" /> My Badges
                </h2>
                <div className="text-sm text-gray-400 flex items-center">
                    {/* Manual Sync Button */}
                    <Tooltip title="Check for newly earned badges">
                        <button
                            onClick={handleSyncAchievements}
                            disabled={isSyncing || isLoading} // Disable if loading badges or syncing
                            className="text-sm p-1.5 rounded text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            aria-label="Sync Achievements"
                        >
                            {isSyncing ? <FiLoader className="animate-spin"/> : <FiRefreshCw />}
                            Sync Now
                        </button>
                    </Tooltip>
                    <span className="text-sm text-gray-400 ml-1">{earnedBadges.length} / {Object.keys(badgeMetadataMap).length}</span>
                </div>
            </div>
            {/* If wallet is not linked, badges can't be earned. Link your Web3 EVM-compatible wallet now. */}
            <p className="text-gray-400 text-xs mb-2 text-center sm:text-left">Link your Web3 EVM-compatible wallet to earn badges.</p>
            {/* Loading spinner while syncing */}
            {isSyncing && <p className="text-gray-400 text-xs mb-2 text-center sm:text-left"><FiLoader className="animate-spin" /> Syncing...</p>}
            {/* Display message if no badges are earned yet */}
            {earnedBadges.length === 0 && !isLoading && <p className="text-gray-400 text-xs mb-2 text-center sm:text-left">No badges earned yet.</p>}
            {/* Display message if no badges are defined */}
        
            {/* Display sync error if it occurred */}
            {syncError && <p className="text-red-400 text-xs mb-2 text-center sm:text-left">{syncError}</p>}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {/* Iterate over ALL defined badges in the metadata map */}
                {Object.entries(badgeMetadataMap).map(([idStr, meta]) => {
                    const badgeId = parseInt(idStr, 10); // Convert key string to number
                    const isEarned = earnedBadgeIds.has(badgeId); // Check if ID is in the earned set

                    // Find the specific earned badge data to get awarded_at (if earned)
                    const earnedData = isEarned ? earnedBadges.find(b => b.badge_id === badgeId) : undefined;
                    const awardedDate = earnedData ? new Date(earnedData.awarded_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
                    const explorerUrl = earnedData ? `${EDUCHAIN_TESTNET_EXPLORER_BASE_URL}/token/${earnedData.contract_address}` : '#'; // Link only if earned

                    let tooltipTitle = `${meta.name} - ${meta.description}`;
                    if (isEarned && awardedDate) {
                        tooltipTitle += ` (Awarded: ${awardedDate})`;
                    } else {
                        tooltipTitle += " (Locked)";
                    }

                    // Define base classes and conditional classes
                    const baseCardClasses = "flex flex-col items-center text-center p-2 rounded-lg bg-white/10 transition-all duration-200 group relative overflow-hidden h-full";
                    const lockedCardClasses = `${baseCardClasses} grayscale opacity-50 cursor-default`;
                    const unlockedCardClasses = `${baseCardClasses} hover:bg-white/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ugm-gold-light/50 aurora-border animate-aurora-flow`;

                    const cardContent = (
                        <>
                            <Image
                                src={getIpfsUrl(meta.image)}
                                alt={meta.name}
                                width={80}
                                height={80}
                                className="w-16 h-16 sm:w-20 sm:h-20 group-hover:shadow-ugm-gold group-hover:shadow-[0_0_10px_3px_var(--tw-shadow-color)] rounded-full mb-3 group-hover:scale-110 transition-all duration-200 bg-gray-700 relative z-[3]"
                                onError={(e) => { e.currentTarget.src = '/badges/badge-placeholder.png'; }}
                            />
                            {/* Inner wrapper for text content for better readability */}
                            <div className="relative z-[2] w-full mt-auto p-2 bg-black/40 rounded-md flex flex-col flex-grow min-h-[5.5rem]"> 
                                <span
                                    className="text-sm font-medium text-gray-50 group-hover:text-ugm-gold-light w-full min-w-0 relative whitespace-normal break-words text-center min-h-[2.8rem] flex items-center justify-center leading-tight mb-1" // text-sm, font-medium, brighter base text, adjusted min-h, leading-tight, mb-1
                                    title={meta.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                >
                                    {meta.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                 </span>
                                {isEarned && awardedDate && (
                                    <span className="text-xs text-gray-300 group-hover:text-ugm-gold-light/80 relative mt-auto pt-1 block text-center text-opacity-80 group-hover:text-opacity-100 transition-opacity"> {/* Added opacity transition */}
                                        {awardedDate}
                                    </span>
                                )}
                            </div>
                        </>
                    );
                    
                    const lockedContent = (
                         <>
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-2 bg-gray-700/50 flex items-center justify-center text-gray-500 group-hover:bg-gray-600/70 relative z-[3]"> {/* Increased mb-2 */}
                                <FiHelpCircle size={32} />
                            </div>
                            {/* Inner wrapper for text content */}
                            <div className="relative z-[2] w-full mt-auto p-2 bg-black/40 rounded-md flex flex-col flex-grow min-h-[5.5rem]"> {/* Increased padding, darker scrim, flex properties, min-height, mt-auto */}
                                <span 
                                    className="text-sm font-medium text-gray-400 group-hover:text-gray-300 w-full min-w-0 relative whitespace-normal break-words text-center min-h-[2.8rem] flex items-center justify-center leading-tight mb-1" // text-sm, font-medium, adjusted min-h, leading-tight, mb-1
                                    title={meta.name}
                                >
                                    {meta.name}
                                </span>
                                {/* No date for locked content */}
                            </div>
                        </>
                    );

                    return (
                        <Tooltip title={tooltipTitle} arrow placement="top" key={badgeId} className='relative z-[5]'>
                            <InteractiveBadgeCard
                                className={isEarned ? unlockedCardClasses : lockedCardClasses}
                                href={isEarned ? explorerUrl : undefined}
                                isEarned={isEarned}
                                ariaLabel={isEarned ? `View details for earned badge: ${meta.name}` : `Locked badge: ${meta.name}`}
                            >
                                {isEarned ? cardContent : lockedContent}
                            </InteractiveBadgeCard>
                        </Tooltip>
                    );
                 })}
            </div>
        </div>
    );
}