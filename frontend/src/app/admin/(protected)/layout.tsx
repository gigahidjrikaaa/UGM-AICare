"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import AdminHeader from '@/components/ui/admin/AdminHeader';
import AdminSidebar from '@/components/ui/admin/AdminSidebar';
import AdminFooter from '@/components/ui/admin/AdminFooter'; // Assuming you'll create this

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Don't do anything while loading

    if (status === "unauthenticated") {
      router.push('/admin'); // Redirect to admin login if not authenticated
    } else if (session?.user?.role !== 'admin') {
      // If authenticated but not an admin, redirect to a general access denied page or user dashboard
      console.warn("Access Denied: User is not an admin.", session?.user);
      router.push('/access-denied'); // Or perhaps '/aika' or another appropriate page
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 mb-4 animate-bounce"></div>
          <div className="text-white text-lg">Loading Admin Panel...</div>
        </div>
      </div>
    );
  }

  // If not authenticated as admin, the useEffect above will handle redirection.
  // Return null or a minimal loader while redirection is in progress.
  if (status !== "authenticated" || session?.user?.role !== 'admin') {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
            <div className="text-white text-lg">Redirecting...</div>
        </div>
    );
  }

  // Render layout if authenticated as admin
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] text-white flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#001030]/30">
          {children}
        </main>
        <AdminFooter />
      </div>
    </div>
  );
}
