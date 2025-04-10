"use client";
import React, { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import Image from 'next/image'; // For displaying images

interface EarnedBadge {
    badge_id: number;
    awarded_at: string; // Dates usually come as strings
    transaction_hash: string;
    contract_address: string;
    // Add metadata fields if your backend endpoint includes them
    name?: string; // Example: Add name/description later
    description?: string;
    image_url?: string; // Example: Local placeholder URL
}

// Map badge IDs to names and placeholder images (adjust paths)
const badgeMetadata: { [key: number]: { name: string; image: string; description: string } } = {
    1: { name: "Let there be badge", image: "/badges/badge-1-placeholder.png", description:"Your first activity!" },
    2: { name: "Triple Threat (of Thoughts!)", image: "/badges/badge-2-placeholder.png", description:"3 days of activity" },
    3: { name: "Seven Days a Week", image: "/badges/badge-3-placeholder.png", description:"7-day streak" },
    4: { name: "Two Weeks Notice (...)", image: "/badges/badge-4-placeholder.png", description:"14-day streak" },
    5: { name: "Full Moon Positivity", image: "/badges/badge-5-placeholder.png", description:"30-day streak" },
    6: { name: "Quarter Century (...)", image: "/badges/badge-6-placeholder.png", description:"25 journal entries" },
    // Add placeholders for 7 & 8 if needed
};


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
                    const meta = badgeMetadata[badge.badge_id] || { name: `Badge #${badge.badge_id}`, image: '/badges/badge-placeholder.png', description:'Unknown badge'};
                    return (
                        <div key={badge.transaction_hash} className="flex flex-col items-center text-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition group" title={`${meta.name} - ${meta.description}`}>
                            <Image
                                src={meta.image}
                                alt={meta.name}
                                width={64} // Adjust size
                                height={64}
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-1 group-hover:scale-110 transition-transform"
                            />
                            <span className="text-xs text-gray-300 group-hover:text-[#FFCA40] truncate w-full">{meta.name}</span>
                            {/* Optional: Link to transaction hash on explorer */}
                            {/* <a href={`EXPLORER_URL/${badge.transaction_hash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">Verify</a> */}
                        </div>
                    );
                 })}
            </div>
        </div>
    );
}