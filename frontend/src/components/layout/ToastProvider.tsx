// src/components/layout/ToastProvider.tsx
"use client";

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      toast.success(`Welcome back, ${session.user.name}!`);
    }
  }, [status, session]);

  return <>{children}</>;
}
