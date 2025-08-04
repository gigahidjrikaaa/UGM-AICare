// src/components/ui/DynamicAnimatedComponents.tsx
'use client';

import { lazy, Suspense } from 'react';

// Lazy load heavy animated components
const PulsingLoader = lazy(() => import('./AnimatedComponents').then(module => ({
  default: module.PulsingLoader
})));

const SpinningLoader = lazy(() => import('./AnimatedComponents').then(module => ({
  default: module.SpinningLoader
})));

const AnimatedToast = lazy(() => import('./AnimatedComponents').then(module => ({
  default: module.AnimatedToast
})));

const AnimatedButton = lazy(() => import('./AnimatedComponents').then(module => ({
  default: module.AnimatedButton
})));

const FloatingHearts = lazy(() => import('./AnimatedComponents').then(module => ({
  default: module.FloatingHearts
})));

const FloatingStars = lazy(() => import('./AnimatedComponents').then(module => ({
  default: module.FloatingStars
})));

// Lightweight fallbacks
const LoaderSkeleton = () => (
  <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
);

const ToastSkeleton = () => (
  <div className="w-64 h-12 bg-gray-300 rounded animate-pulse" />
);

const ButtonSkeleton = () => (
  <div className="px-4 py-2 bg-gray-300 rounded animate-pulse" />
);

const HeartsSkeleton = () => (
  <div className="w-6 h-6 bg-red-300 rounded animate-pulse" />
);

// Exported dynamic components with proper typing
interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  visible: boolean;
  onClose: () => void;
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

interface FloatingProps {
  count?: number;
}

export const DynamicPulsingLoader: React.FC<LoaderProps> = (props) => (
  <Suspense fallback={<LoaderSkeleton />}>
    <PulsingLoader {...props} />
  </Suspense>
);

export const DynamicSpinningLoader: React.FC<Pick<LoaderProps, 'size'>> = (props) => (
  <Suspense fallback={<LoaderSkeleton />}>
    <SpinningLoader {...props} />
  </Suspense>
);

export const DynamicAnimatedToast: React.FC<ToastProps> = (props) => (
  <Suspense fallback={<ToastSkeleton />}>
    <AnimatedToast {...props} />
  </Suspense>
);

export const DynamicAnimatedButton: React.FC<ButtonProps> = (props) => (
  <Suspense fallback={<ButtonSkeleton />}>
    <AnimatedButton {...props} />
  </Suspense>
);

export const DynamicFloatingHearts: React.FC<FloatingProps> = (props) => (
  <Suspense fallback={<HeartsSkeleton />}>
    <FloatingHearts {...props} />
  </Suspense>
);

export const DynamicFloatingStars: React.FC<FloatingProps> = (props) => (
  <Suspense fallback={<HeartsSkeleton />}>
    <FloatingStars {...props} />
  </Suspense>
);

// Default export with all components
const DynamicAnimatedComponents = {
  PulsingLoader: DynamicPulsingLoader,
  SpinningLoader: DynamicSpinningLoader,
  AnimatedToast: DynamicAnimatedToast,
  AnimatedButton: DynamicAnimatedButton,
  FloatingHearts: DynamicFloatingHearts,
  FloatingStars: DynamicFloatingStars,
};

export default DynamicAnimatedComponents;
