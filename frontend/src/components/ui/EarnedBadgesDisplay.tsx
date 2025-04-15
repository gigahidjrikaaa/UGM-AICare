"use client";
import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import Image from 'next/image';
import { FiExternalLink, FiAward, FiHelpCircle } from 'react-icons/fi';
import { Tooltip } from '@mui/material';
// import { format } from 'date-fns';
// import { id } from 'date-fns/locale';


// Import from the new constants file
import { getIpfsUrl, badgeMetadataMap } from '@/lib/badgeConstants';

// --- Define EDUChain Testnet Explorer ---
const EDUCHAIN_TESTNET_EXPLORER_BASE_URL = "https://edu-chain-testnet.blockscout.com";

interface EarnedBadge {
    badge_id: number;
    awarded_at: string; // Dates usually come as strings
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


export default function EarnedBadgesDisplay() {
    const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);    // State to hold the badges
    const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<number>>(new Set()); // State to hold the IDs of the badges
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBadges = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiClient.get<EarnedBadge[]>('/activity-summary/my-badges');
                setEarnedBadges(response.data);
                // Create a Set of earned IDs for efficient checking
                setEarnedBadgeIds(new Set(response.data.map(badge => badge.badge_id)));
            } catch (err) {
                console.error("Error fetching earned badges:", err);
                setError("Could not load earned badges.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBadges();
    }, []);

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
            <h3 className="font-semibold mb-3 text-lg text-white flex items-center">
                <FiAward className="mr-2 text-[#FFCA40]" /> Your Badges
            </h3>
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
                    const baseClasses = "flex flex-col items-center text-center p-2 rounded-lg bg-white/10 transition-all duration-200 group";
                    const lockedClasses = "grayscale opacity-50 cursor-default";
                    const unlockedClasses = "hover:bg-white/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50";

                    return (
                        <Tooltip title={tooltipTitle} arrow placement="top" key={badgeId}>
                            {/* Use Link or Div based on earned status */}
                            {isEarned && earnedData ? (
                                <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${baseClasses} ${unlockedClasses}`}
                                    aria-label={`View details for earned badge: ${meta.name}`}
                                >
                                    <Image
                                        src={getIpfsUrl(meta.image)} // Use IPFS gateway URL
                                        alt={meta.name}
                                        width={80}
                                        height={80}
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-1 group-hover:scale-110 transition-transform duration-200 bg-gray-700" // Added bg
                                        onError={(e) => { e.currentTarget.src = '/badges/badge-placeholder.png'; }}
                                    />
                                    <span className="text-xs text-gray-200 group-hover:text-[#FFCA40] truncate w-full px-1 flex items-center justify-center">
                                         {meta.name}
                                         <FiExternalLink size={10} className="ml-1 opacity-60 group-hover:opacity-100 inline-block"/>
                                     </span>
                                </a>
                            ) : (
                                <div
                                    className={`${baseClasses} ${lockedClasses}`}
                                    aria-label={`Locked badge: ${meta.name}`}
                                >
                                    {/* Placeholder for locked badge */}
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-1 bg-gray-700 flex items-center justify-center text-gray-500 group-hover:bg-gray-600">
                                        <FiHelpCircle size={32} />
                                        {/* Or use FiLock */}
                                        {/* <FiLock size={28} /> */}
                                    </div>
                                    <span className="text-xs text-gray-500 group-hover:text-gray-400 truncate w-full px-1">{meta.name}</span>
                                </div>
                            )}
                        </Tooltip>
                    );
                 })}
            </div>
        </div>
    );
}