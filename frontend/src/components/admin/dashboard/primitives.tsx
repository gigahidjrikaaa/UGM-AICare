'use client';

/**
 * Premium console primitives — "Ethereal Glass" system for the admin console.
 *
 * - Bezel: double-bezel nested card architecture (machined glass plate in a tray)
 * - Reveal: viewport-entry choreography (blur + lift + fade, spring-mass easing)
 * - Eyebrow: microscopic pill tag preceding major headings
 * - ZoneLabel: hairline section divider with floating label
 *
 * Motion contract: transform/opacity/filter only. No layout-triggering props.
 */

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/** Signature easing — heavy mass, fluid settle. Used for every transition. */
export const EASE = [0.32, 0.72, 0, 1] as const;

/** Staggered entry variants for children of a Reveal group. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: EASE },
  },
};

interface RevealProps {
  children: ReactNode;
  /** 0-based index — multiplies the entry delay for cascade rhythm. */
  index?: number;
  className?: string;
  /** Disable the initial animation (e.g. for content that must render instantly). */
  instant?: boolean;
}

/** Viewport-entry reveal: heavy fade-up with blur resolution. Runs once. */
export function Reveal({ children, index = 0, className, instant = false }: RevealProps) {
  if (instant) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.85, ease: EASE, delay: index * 0.07 }}
    >
      {children}
    </motion.div>
  );
}

interface BezelProps {
  children: ReactNode;
  className?: string;
  /** Inner core background classes. */
  coreClassName?: string;
  /** Outer shell tint — use for semantic states (critical, success). */
  shellClassName?: string;
  /** Render as a different element. */
  as?: 'div' | 'section' | 'article';
}

/**
 * Double-bezel ("Doppelrand") card — the outer shell is a machined tray
 * (hairline ring + subtle fill + padding), the inner core is the glass plate
 * with its own inset top highlight and a concentric, mathematically smaller
 * radius.
 */
export function Bezel({
  children,
  className = '',
  coreClassName = '',
  shellClassName = '',
  as = 'div',
}: BezelProps) {
  const Tag = as;

  return (
    <Tag
      className={`rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/10 ${shellClassName} ${className}`}
    >
      <div
        className={`h-full rounded-[calc(2rem-0.375rem)] bg-[#020b22]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] ${coreClassName}`}
      >
        {children}
      </div>
    </Tag>
  );
}

/** Microscopic pill tag that precedes major headings. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60 ring-1 ring-white/10 ${className}`}
    >
      {children}
    </span>
  );
}

/** Hairline divider with a floating zone label — scannable dashboard rhythm. */
export function ZoneLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 pt-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
    </div>
  );
}

/**
 * Fixed ambient mesh orbs + film grain. Purely decorative, pointer-events-none,
 * GPU-safe (opacity/transform only). Mount once per page, position: fixed.
 */
export function AmbientLayer() {
  return (
    <>
      {/* Radial mesh orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[34rem] w-[34rem] rounded-full bg-[#FFCA40]/[0.07] blur-[140px]" />
        <div className="absolute right-[-8rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#2E5BFF]/[0.09] blur-[140px]" />
        <div className="absolute bottom-[-10rem] left-[-6rem] h-[26rem] w-[26rem] rounded-full bg-emerald-400/[0.05] blur-[140px]" />
      </div>
      {/* Film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </>
  );
}
