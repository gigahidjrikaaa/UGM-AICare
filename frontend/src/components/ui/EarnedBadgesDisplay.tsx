"use client";
import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import Image from 'next/image';
// import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import { Tooltip } from '@mui/material';
// import { format } from 'date-fns';
// import { id } from 'date-fns/locale';

// Import from the new constants file
import { getBadgeMeta, getIpfsUrl } from '@/lib/badgeConstants';

interface EarnedBadge {
    badge_id: number;
    awarded_at: string; // Dates usually come as strings
    transaction_hash: string;
    contract_address: string;
    // Add metadata fields if your backend endpoint includes them
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
    const [badges, setBadges] = useState<EarnedBadge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBadges = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await apiClient.get<EarnedBadge[]>('/activity-summary/my-badges');
                setBadges(response.data);
            } catch (err) {
                console.error("Error fetching earned badges:", err);
                setError("Could not load earned badges.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchBadges();
    }, []);

    if (isLoading) return <div className="p-4 text-center text-gray-400">Loading badges...</div>;
    if (error) return <div className="p-4 text-center text-red-400">{error}</div>;
    if (badges.length === 0) return <div className="p-4 text-center text-gray-400 italic">No badges earned yet. Keep going!</div>;

    return (
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="font-semibold mb-3 text-lg text-white">Your Badges</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                {badges.map((badge) => {
                    // Use the imported helper to get metadata
                    const meta = getBadgeMeta(badge.badge_id);
                    // Use the imported helper to get the image URL
                    const imageUrl = getIpfsUrl(meta.image);
                    const awardedDate = new Date(badge.awarded_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
                    const tooltipTitle = `${meta.name} - ${meta.description} (Awarded: ${awardedDate})`;

                    return (
                        <Tooltip title={tooltipTitle} arrow placement="top" key={badge.transaction_hash}>
                            <div className="flex flex-col items-center text-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition group cursor-help">
                                <Image
                                    src={imageUrl} // Use URL from helper
                                    alt={meta.name}
                                    width={80}
                                    height={80}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-1 group-hover:scale-110 transition-transform duration-200 bg-gray-700" // Added bg for loading state
                                    onError={(e) => { e.currentTarget.src = '/badges/badge-placeholder.png'; }} // Fallback
                                />
                                <span className="text-xs text-gray-300 group-hover:text-[#FFCA40] truncate w-full px-1">{meta.name}</span>
                                {/* Optional: Link to transaction hash on explorer */}
                                {/* <a href={`EXPLORER_URL/${badge.transaction_hash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">Verify</a> */}
                                </div>
                        </Tooltip>
                    );
                 })}
            </div>
        </div>
    );
}