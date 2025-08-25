// frontend/src/app/profile/page.tsx (New File)
"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import EarnedBadgesDisplay from '@/components/ui/EarnedBadgesDisplay';
import StreakDisplay from '@/components/features/journaling/StreakDisplay';
import GlobalSkeleton from '@/components/ui/GlobalSkeleton'; // Use a skeleton for loading
import { FiMail, FiCreditCard, FiActivity, FiBell, FiBellOff, FiLoader, FiSettings  } from 'react-icons/fi'; // Icons
import ParticleBackground from '@/components/ui/ParticleBackground';
import apiClient from '@/services/api'; // Import apiClient
import { format } from 'date-fns'; // Import format for current month
import { Switch } from '@headlessui/react'; // Import Switch for toggle

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

    const [allowCheckins, setAllowCheckins] = useState<boolean>(false); // Default to false until session loads
    const [isSavingCheckinSetting, setIsSavingCheckinSetting] = useState<boolean>(false);
    const [checkinSettingError, setCheckinSettingError] = useState<string | null>(null);

    // --- Fetch/Set Initial Check-in State ---
    useEffect(() => {
        if (session?.user) {
            // Set initial state from session data (ensure it exists!)
            setAllowCheckins((session.user as { allow_email_checkins?: boolean }).allow_email_checkins ?? true); // Default to true if undefined in session? Or false?
        }
    }, [session]);

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

    // --- NEW Handler to Update Check-in Preference ---
    const handleCheckinToggle = async (enabled: boolean) => {
        setAllowCheckins(enabled); // Optimistically update UI
        setIsSavingCheckinSetting(true);
        setCheckinSettingError(null);
        try {
            const payload = { allow_email_checkins: enabled };
            // Call the backend endpoint
            await apiClient.put('/profile/settings/checkins', payload);
             // Optional: Show success message briefly
             // You might need to call the `update()` function from `useSession`
             // if you want the session object itself to immediately reflect the change
             // await update({ allow_email_checkins: enabled });
             console.log("Check-in preference updated successfully");
        } catch (error) {
             console.error("Failed to update check-in preference:", error);
             setCheckinSettingError("Failed to save preference.");
             // Revert optimistic UI update on error
             setAllowCheckins(!enabled);
        } finally {
            setIsSavingCheckinSetting(false);
        }
    };

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
        <div className="min-h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 text-white pt-8">
            <div className="absolute inset-0 z-0 opacity-100">
                <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
            </div>
            <main className="max-w-4xl mx-auto p-4 md:p-8 bg-white/5 rounded-lg shadow-lg relative z-10 mb-10">
                <h1 className="text-3xl font-bold mb-6 text-center">Profile</h1>
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

                {/* --- Settings Section --- */}
                <div className='mb-8'>
                    <h2 className="text-xl font-semibold mb-3 flex items-center"><FiSettings className="mr-2 text-[#FFCA40]" /> Settings</h2>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-white">Proactive Email Check-ins</h4>
                                <p className="text-xs text-gray-400">Receive occasional encouraging check-in emails from Aika if you haven&apos;t chatted or journaled in a few days.</p>
                                 {checkinSettingError && <p className="text-xs text-red-400 mt-1">{checkinSettingError}</p>}
                            </div>
                            <div className="flex items-center">
                                 {isSavingCheckinSetting && <FiLoader className="animate-spin text-sm text-gray-400 mr-2"/>}
                                <Switch
                                    checked={allowCheckins}
                                    onChange={handleCheckinToggle}
                                    disabled={isSavingCheckinSetting}
                                    className={`${
                                    allowCheckins ? 'bg-[#FFCA40]' : 'bg-gray-600'
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/80 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50`}
                                >
                                    <span className="sr-only">Toggle email check-ins</span>
                                    <span
                                    className={`${
                                        allowCheckins ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </Switch>
                                 {allowCheckins ? <FiBell className="ml-2 text-green-400"/> : <FiBellOff className="ml-2 text-gray-500"/>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Streaks Section --- */}
                <div className="mb-8">
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

                 {/* --- Badges Section --- */}
                 <div>
                     <EarnedBadgesDisplay />
                 </div>
            </main>
        </div>
    );
}