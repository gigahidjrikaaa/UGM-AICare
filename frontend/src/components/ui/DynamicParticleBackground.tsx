// src/components/ui/DynamicParticleBackground.tsx
'use client';

import { lazy, Suspense } from 'react';

// Lazy load the particle background component
const ParticleBackground = lazy(() => import('./ParticleBackground'));

// Lightweight fallback while loading
const ParticleBackgroundSkeleton = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-ugm-blue via-ugm-blue-dark to-black opacity-90" />
);

interface DynamicParticleBackgroundProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  speed?: number;
}

export const DynamicParticleBackground: React.FC<DynamicParticleBackgroundProps> = ({ 
  count = 50,
  colors,
  minSize,
  maxSize,
  speed
}) => {
  return (
    <Suspense fallback={<ParticleBackgroundSkeleton />}>
      <ParticleBackground 
        count={count}
        colors={colors}
        minSize={minSize}
        maxSize={maxSize}
        speed={speed}
      />
    </Suspense>
  );
};

export default DynamicParticleBackground;
