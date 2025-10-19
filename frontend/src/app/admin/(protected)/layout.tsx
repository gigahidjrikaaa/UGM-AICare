"use client";

import { ReactNode } from 'react';
import AdminHeader from '@/components/ui/admin/AdminHeader';
import AdminSidebar from '@/components/ui/admin/AdminSidebar';
import AdminFooter from '@/components/ui/admin/AdminFooter';
import { useAdminSessionGuard } from '@/hooks/useAdminSessionGuard';
import { useAdminSessionExpiry } from '@/hooks/useSessionExpiry';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Monitor for backend token expiry and auto sign-out
  useAdminSessionExpiry();

  // Use the session guard hook to automatically handle expiry and validation
  const { isValid, isLoading } = useAdminSessionGuard({
    redirectPath: '/admin',
    checkInterval: 60000, // Check every minute
    onSessionExpired: () => {
      console.log('Admin session expired. User will be redirected to login.');
    },
  });

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 mb-4 animate-bounce"></div>
          <div className="text-white text-lg">Loading Admin Panel...</div>
        </div>
      </div>
    );
  }

  // If session is invalid, show redirecting message (hook handles actual redirect)
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="text-white text-lg mb-2">Session Expired</div>
          <div className="text-white/60 text-sm">Redirecting to login...</div>
        </div>
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
