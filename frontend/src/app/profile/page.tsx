// frontend/src/app/profile/page.tsx (New File)
"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react'; // Added useState, useEffect, useCallback
import EarnedBadgesDisplay from '@/components/ui/EarnedBadgesDisplay';
import StreakDisplay from '@/components/journaling/StreakDisplay';
import GlobalSkeleton from '@/components/ui/GlobalSkeleton'; // Use a skeleton for loading
import { FiMail, FiCreditCard, FiAward, FiActivity  } from 'react-icons/fi'; // Example icons
import ParticleBackground from '@/components/ui/ParticleBackground';
import apiClient from '@/services/api'; // Import apiClient
import { format } from 'date-fns'; // Import format for current month

// Define the expected response structure from the backend endpoint
interface ActivitySummaryResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: any; // We don't need the summary detail here, but the API returns it
    currentStreak: number;
    longestStreak: number;
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State for streak data
    const [currentStreak, setCurrentStreak] = useState<number>(0);
    const [longestStreak, setLongestStreak] = useState<number>(0);
    const [isStreakLoading, setIsStreakLoading] = useState(true); // Loading state for streak
    const [streakError, setStreakError] = useState<string | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/signin?callbackUrl=/profile');
        }
    }, [status, router]);

    // Fetch streak data when session is available
    const fetchStreakData = useCallback(async () => {
        if (status === 'authenticated') {
            setIsStreakLoading(true);
            setStreakError(null);
            const currentMonthStr = format(new Date(), 'yyyy-MM'); // Fetch for current month to get streaks
            try {
                const response = await apiClient.get<ActivitySummaryResponse>(
                    `/activity-summary/?month=${currentMonthStr}`
                );
                setCurrentStreak(response.data.currentStreak || 0);
                setLongestStreak(response.data.longestStreak || 0);
            } catch (err) {
                console.error("Error fetching streak data:", err);
                setStreakError("Could not load activity streak.");
                // Reset streaks on error
                setCurrentStreak(0);
                setLongestStreak(0);
            } finally {
                setIsStreakLoading(false);
            }
        }
    }, [status]); // Depend on session status
    
    useEffect(() => {
        fetchStreakData();
    }, [fetchStreakData]); // Run fetch on mount and when status changes

    // Loading state
    if (status === 'loading') {
        // You can replace GlobalSkeleton with a more specific profile skeleton if desired
        return <div className="pt-16"><GlobalSkeleton /></div>;
    }

    // Should not happen if redirect works, but good practice
    if (!session?.user) {
         return <div className="pt-16 text-center text-red-500">Error: User session not found.</div>;
    }

    const user = session.user;

    return (
        // Using a similar gradient background as other pages
        <div className="min-h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white pt-16"> {/* Added pt-16 assuming standard header height */}
            <div className="absolute inset-0 z-0 opacity-40">
                <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8 p-6 bg-white/5 rounded-lg border border-white/10">
                    <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-[#FFCA40]/60 flex-shrink-0">
                        <Image
                            src={user.image || "/default-avatar.png"} // Use default avatar if none
                            alt={user.name || "User"}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold">{user.name || "User"}</h1>
                        <div className="flex items-center justify-center sm:justify-start text-sm text-gray-300 mt-1">
                             <FiMail className="mr-1.5" /> {user.email || "No email"}
                         </div>
                        {/* Display Linked Wallet */}
                        {user.wallet_address ? (
                            <div className="flex items-center justify-center sm:justify-start text-sm text-gray-300 mt-1" title={user.wallet_address}>
                                <FiCreditCard className="mr-1.5 text-green-400" />
                                Wallet Linked: {user.wallet_address.substring(0, 6)}...{user.wallet_address.substring(user.wallet_address.length - 4)}
                            </div>
                         ) : (
                            <div className="flex items-center justify-center sm:justify-start text-sm text-yellow-400 mt-1">
                                 <FiCreditCard className="mr-1.5" /> Wallet not linked
                             </div>
                         )}
                         {/* Optional: Add Role display if needed */}
                         {/* <div className="text-xs text-gray-400 mt-1 capitalize">Role: {user.role || 'user'}</div> */}
                    </div>
                </div>

                {/* --- Streaks Section --- */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 flex items-center"><FiActivity className="mr-2 text-[#FFCA40]"/> Activity Streak</h2>
                    {streakError && !isStreakLoading && (
                        <p className="text-red-400 text-sm">{streakError}</p>
                    )}
                    <StreakDisplay
                        currentStreak={currentStreak}
                        longestStreak={longestStreak}
                        isLoading={isStreakLoading}
                    />
                </div>

                 {/* Section for Badges */}
                 <div className="mb-8">
                     <h2 className="text-xl font-semibold mb-4 flex items-center"><FiAward className="mr-2 text-[#FFCA40]"/> Earned Badges</h2>
                     {/* Render the Badge Display Component */}
                     <EarnedBadgesDisplay />
                 </div>

                {/* Optional: Section for Streaks (Requires fetching streak data again here) */}
                {/*
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Activity Streaks</h2>
                    <StreakDisplay currentStreak={currentStreakState} longestStreak={longestStreakState} isLoading={isStreakLoading} />
                </div>
                */}

                {/* Add other profile sections as needed (e.g., settings link, stats) */}

            </main>
        </div>
    );
}