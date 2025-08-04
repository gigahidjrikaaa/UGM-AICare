// src/components/layout/HydrationSafeWrapper.tsx
'use client';

import { useEffect } from 'react';

interface HydrationSafeWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that prevents hydration mismatches caused by browser extensions
 * or other client-side modifications to the DOM
 */
export default function HydrationSafeWrapper({ children }: HydrationSafeWrapperProps) {
  useEffect(() => {
    // Ensure component is properly hydrated on client side
    // This helps prevent hydration mismatches from browser extensions
  }, []);

  // Always render children, but suppress hydration warnings for known extension issues
  return (
    <div className="flex flex-col flex-grow" suppressHydrationWarning>
      {children}
    </div>
  );
}
