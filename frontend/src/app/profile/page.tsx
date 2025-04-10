// frontend/src/app/profile/page.tsx (New File)
"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect } from 'react';
import EarnedBadgesDisplay from '@/components/ui/EarnedBadgesDisplay'; // Import the component
import GlobalSkeleton from '@/components/ui/GlobalSkeleton'; // Use a skeleton for loading
import { FiMail, FiCreditCard, FiAward } from 'react-icons/fi'; // Example icons

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/signin?callbackUrl=/profile');
        }
    }, [status, router]);

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