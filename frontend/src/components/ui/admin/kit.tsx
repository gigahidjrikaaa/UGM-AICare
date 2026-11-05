"use client";

/**
 * Admin UI kit — the canonical visual language for the admin console.
 *
 * Canonical look (matches campaigns/cases/quick-triage/users):
 *   card    rounded-2xl border-white/10 bg-white/5 backdrop-blur-md
 *   primary gold #FFCA40 with navy ink #001D58
 *   chips   bg-X-500/10 text-X-400 border-X-500/20, one semantic tone map
 *   fields  rounded-xl border-white/10 bg-white/5, gold focus ring
 *
 * Dashboard keeps its own Bezel/Eyebrow system (components/admin/dashboard/
 * primitives.tsx) — the two coexist.
 */

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
} from "react";
import { FiRefreshCw } from "react-icons/fi";

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

type AdminPageHeaderProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ icon, title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          {icon && <span className="text-[#FFCA40]">{icon}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

type AdminCardProps = {
  children: ReactNode;
  className?: string;
};

export function AdminCard({ children, className = "" }: AdminCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export type AdminButtonVariant = "primary" | "secondary" | "accent" | "danger";
export type AdminButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCA40]/50";

const BUTTON_VARIANTS: Record<AdminButtonVariant, string> = {
  primary:
    "rounded-xl bg-[#FFCA40] text-[#001D58] shadow-lg shadow-[#FFCA40]/20 hover:bg-[#FFCA40]/90",
  secondary:
    "rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10",
  accent:
    "rounded-xl border border-[#FFCA40]/30 bg-[#FFCA40]/15 text-[#FFCA40] hover:bg-[#FFCA40]/25",
  danger:
    "rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20",
};

const BUTTON_SIZES: Record<AdminButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
};

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
  function AdminButton({ variant = "secondary", size = "md", className = "", type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
        {...rest}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Status chip + semantic tones
// ---------------------------------------------------------------------------

export type ChipTone =
  | "blue"
  | "amber"
  | "emerald"
  | "rose"
  | "red"
  | "slate"
  | "violet"
  | "orange";

const CHIP_TONES: Record<ChipTone, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function chipClasses(tone: ChipTone): string {
  return `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${CHIP_TONES[tone]}`;
}

/**
 * Canonical status → tone semantics across the console:
 * new/scheduled/pending = blue · in_progress/waiting/queued = amber ·
 * resolved/completed/active/approved = emerald · cancelled = rose ·
 * failed/rejected/critical = red · closed/no_show/expired = slate.
 */
export const STATUS_TONE: Record<string, ChipTone> = {
  // cases
  new: "blue",
  in_progress: "amber",
  waiting: "amber",
  resolved: "emerald",
  closed: "slate",
  // appointments
  scheduled: "blue",
  completed: "emerald",
  cancelled: "rose",
  no_show: "slate",
  moved: "blue",
  // campaigns / interventions
  active: "emerald",
  draft: "slate",
  paused: "amber",
  awaiting_approval: "amber",
  pending_review: "amber",
  approved: "emerald",
  rejected: "red",
  sent: "emerald",
  failed: "red",
  // autopilot
  pending: "blue",
  executing: "amber",
  executed: "emerald",
  skipped: "slate",
  expired: "slate",
  // users
  user: "blue",
  counselor: "violet",
  admin: "amber",
  guest: "slate",
};

export function StatusChip({
  status,
  tone,
  label,
  className = "",
}: {
  /** Raw status key — mapped through STATUS_TONE when `tone` not given. */
  status?: string;
  tone?: ChipTone;
  label?: string;
  className?: string;
}) {
  const resolvedTone = tone ?? (status ? STATUS_TONE[status] ?? "slate" : "slate");
  return (
    <span className={`${chipClasses(resolvedTone)} ${className}`}>
      {label ?? status?.replace(/_/g, " ") ?? ""}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

const FIELD_BASE =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/40 [color-scheme:dark]";

export const AdminInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function AdminInput({ className = "", ...rest }, ref) {
    return <input ref={ref} className={`${FIELD_BASE} ${className}`} {...rest} />;
  },
);

export const AdminTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AdminTextarea({ className = "", rows = 3, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={`${FIELD_BASE} resize-none ${className}`} {...rest} />;
  },
);

export const AdminSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function AdminSelect({ className = "", children, ...rest }, ref) {
    return (
      <select ref={ref} className={`${FIELD_BASE} ${className}`} {...rest}>
        {children}
      </select>
    );
  },
);

/** Option elements need a dark background — render inside AdminSelect. */
export function AdminSelectOption(props: React.SelectHTMLAttributes<HTMLOptionElement>) {
  return <option className="bg-[#001D58]" {...props} />;
}

// ---------------------------------------------------------------------------
// Quick filter chip (toggle)
// ---------------------------------------------------------------------------

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[#FFCA40]/40 bg-[#FFCA40]/20 text-[#FFCA40]"
          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Loading / error / empty
// ---------------------------------------------------------------------------

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#FFCA40]" />
        {label && <p className="mt-3 text-sm text-white/60">{label}</p>}
      </div>
    </div>
  );
}

export function AdminErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
      <div className="flex items-start justify-between gap-4">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
          >
            <FiRefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
      {icon && <div className="mb-3 flex justify-center text-white/20">{icon}</div>}
      <p className="text-lg font-medium text-white/70">{title}</p>
      {hint && <p className="mt-1 text-sm text-white/40">{hint}</p>}
    </div>
  );
}

/** Standard section heading inside a page (below the AdminPageHeader). */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold tracking-tight text-white">{children}</h2>
      {action}
    </div>
  );
}
