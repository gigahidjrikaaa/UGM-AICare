"use client";

import { ReactNode } from 'react';
import CounselorHeader from '@/components/ui/counselor/CounselorHeader';
import CounselorSidebar from '@/components/ui/counselor/CounselorSidebar';
import CounselorFooter from '@/components/ui/counselor/CounselorFooter';
import { useCounselorSessionGuard } from '@/hooks/useCounselorSessionGuard';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CounselorLayout({ children }: { children: ReactNode }) {
  // Monitor for backend token expiry
  useSessionExpiry();

  const { isValid, isLoading } = useCounselorSessionGuard({
    redirectPath: '/counselor',
    checkInterval: 60000,
    onSessionExpired: () => {
      console.log('Counselor session expired. User will be redirected to login.');
    },
  });
  // Router and effect must be declared unconditionally (hooks rules)
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isValid) {
      router.push('/access-denied');
    }
  }, [isLoading, isValid, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 mb-4 animate-bounce"></div>
          <div className="text-white text-lg">Loading Counselor Portal...</div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] text-white flex">
      <CounselorSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <CounselorHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
        <CounselorFooter />
      </div>
    </div>
  );
}
