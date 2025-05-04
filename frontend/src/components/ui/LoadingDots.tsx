// src/components/ui/LoadingDots.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingDotsProps {
  text?: string;
  className?: string;
}

export function LoadingDots({ text = "Loading...", className }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
      {text && <span className="text-xs font-medium text-current/80">{text}</span>}
    </div>
  );
}