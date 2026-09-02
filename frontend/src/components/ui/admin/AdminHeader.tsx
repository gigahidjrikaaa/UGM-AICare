"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { FiSearch, FiBell, FiMenu, FiChevronDown, FiLogOut, FiUser, FiSettings, FiPieChart, FiCalendar, FiUsers } from 'react-icons/fi';
import { Popover, Transition } from '@headlessui/react';
import { usePathname, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useSSEEventHandler } from '@/contexts/AdminSSEContext';
import { apiCall } from '@/utils/adminApi';
import { useProfilePicture } from '@/hooks/useProfilePicture';
import type { AlertData, AlertSeverity, IAReportGeneratedData, SLABreachData } from '@/types/sse';
// Language switcher removed (next-intl reverted)

type AlertNotification = {
  id?: string;
  clientId: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  link?: string | null;
  created_at: string;
  is_seen: boolean;
  source: 'api' | 'sse';
};

type AlertsListResponse = {
  alerts: Array<{
    id: string;
    alert_type: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    link?: string | null;
    created_at: string;
    is_seen: boolean;
  }>;
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
};

type UnreadStatsResponse = {
  total_unread: number;
  critical_unread: number;
  high_unread: number;
  requires_attention: number;
};

const MAX_ALERTS = 10;

const severityStyles: Record<AlertSeverity, { label: string; dot: string; text: string; bg: string; border: string }> = {
  critical: {
    label: 'Critical',
    dot: 'bg-red-400',
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'ring-red-500/20',
  },
  high: {
    label: 'High',
    dot: 'bg-orange-400',
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'ring-orange-500/20',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bg: 'bg-amber-400/10',
    border: 'ring-amber-400/20',
  },
  low: {
    label: 'Low',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'ring-emerald-500/20',
  },
  info: {
    label: 'Info',
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'ring-sky-500/20',
  },
};

const normalizeSeverity = (value?: string): AlertSeverity => {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'info') {
    return value;
  }
  return 'info';
};

const formatAlertType = (value: string) => {
  if (!value) return 'Alert';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatAlertTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  return formatDistanceToNow(date, { addSuffix: true });
};

const alertTimeValue = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const mergeAlerts = (primary: AlertNotification[], secondary: AlertNotification[]) => {
  const seen = new Set<string>();
  const merged: AlertNotification[] = [];
  [...primary, ...secondary].forEach((alert) => {
    const key = alert.id ? `id:${alert.id}` : `client:${alert.clientId}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(alert);
  });
  return merged.sort((a, b) => alertTimeValue(b.created_at) - alertTimeValue(a.created_at)).slice(0, MAX_ALERTS);
};

export default function AdminHeader({ onMenuToggle }: { onMenuToggle?: () => void } = {}) {
  const { data: session } = useSession();
  const { src: profilePictureSrc } = useProfilePicture();
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [hasLoadedAlerts, setHasLoadedAlerts] = useState(false);
  const pendingSeenRef = useRef(new Set<string>());
  const alertsRef = useRef<AlertNotification[]>(alerts);
  const fetchAlertsRef = useRef<() => Promise<void>>(undefined);
  const fetchUnreadRef = useRef<() => Promise<void>>(undefined);
  const markSeenRef = useRef<(alert: AlertNotification) => Promise<void>>(undefined);
  // i18n removed
  // Add state for mobile sidebar toggle if you implement a drawer sidebar for mobile

  const fetchUnreadStats = useCallback(async () => {
    setIsLoadingCount(true);
    try {
      const stats = await apiCall<UnreadStatsResponse>('/api/v1/admin/alerts/stats/unread');
      const serverUnread = Math.max(0, Number(stats.total_unread || 0));
      const localUnread = alertsRef.current.filter((alert) => !alert.is_seen).length;
      setUnreadCount(Math.max(serverUnread, localUnread));
    } catch (error) {
      console.error('Failed to fetch unread alert stats:', error);
    } finally {
      setIsLoadingCount(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    try {
      const response = await apiCall<AlertsListResponse>(`/api/v1/admin/alerts?limit=${MAX_ALERTS}&offset=0`);
      const items: AlertNotification[] = response.alerts.map((alert) => ({
        id: alert.id,
        clientId: alert.id,
        alert_type: alert.alert_type,
        severity: normalizeSeverity(alert.severity),
        title: alert.title,
        message: alert.message,
        link: alert.link ?? null,
        created_at: alert.created_at,
        is_seen: alert.is_seen,
        source: 'api',
      }));

      const merged = mergeAlerts(items, alertsRef.current);
      const localUnread = merged.filter((alert) => !alert.is_seen).length;
      const serverUnread = typeof response.unread_count === 'number'
        ? response.unread_count
        : localUnread;

      setAlerts(merged);
      setUnreadCount(Math.max(serverUnread, localUnread));
      setHasLoadedAlerts(true);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  const markAlertSeen = useCallback(async (alert: AlertNotification) => {
    if (alert.is_seen) {
      return;
    }

    if (!alert.id) {
      setAlerts((prev) => prev.map((item) => (item.clientId === alert.clientId ? { ...item, is_seen: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
      return;
    }

    if (pendingSeenRef.current.has(alert.id)) {
      return;
    }

    pendingSeenRef.current.add(alert.id);
    try {
      await apiCall(`/api/v1/admin/alerts/${alert.id}/seen`, { method: 'PUT' });
      setAlerts((prev) => prev.map((item) => (item.id === alert.id ? { ...item, is_seen: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error('Failed to mark alert as seen:', error);
      toast.error('Failed to update alert');
    } finally {
      pendingSeenRef.current.delete(alert.id);
    }
  }, []);

  fetchAlertsRef.current = fetchAlerts;
  fetchUnreadRef.current = fetchUnreadStats;
  markSeenRef.current = markAlertSeen;

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    fetchUnreadStats();
    if (!hasLoadedAlerts) {
      fetchAlertsRef.current?.();
    }
    const interval = setInterval(() => {
      fetchUnreadRef.current?.();
    }, 45000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchUnreadStats, hasLoadedAlerts]);

  useSSEEventHandler<AlertData>('alert_created', useCallback((data) => {
    const severity = normalizeSeverity(data.severity);
    const nextAlert: AlertNotification = {
      clientId: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      alert_type: data.alert_type,
      severity,
      title: data.title || 'System Alert',
      message: data.message || 'A new alert was created.',
      link: data.link ?? null,
      created_at: data.timestamp || new Date().toISOString(),
      is_seen: false,
      source: 'sse',
    };

    const merged = mergeAlerts([nextAlert], alertsRef.current);
    setAlerts(merged);
    const localUnread = merged.filter((alert) => !alert.is_seen).length;
    setUnreadCount((count) => Math.max(count + 1, localUnread));
  }, []));

  useSSEEventHandler<SLABreachData>('sla_breach', useCallback((data) => {
    const nextAlert: AlertNotification = {
      clientId: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      alert_type: data.alert_type,
      severity: normalizeSeverity(data.severity),
      title: data.title || 'SLA breach detected',
      message: data.message || 'A case has breached its SLA.',
      link: data.link ?? null,
      created_at: data.timestamp || new Date().toISOString(),
      is_seen: false,
      source: 'sse',
    };

    const merged = mergeAlerts([nextAlert], alertsRef.current);
    setAlerts(merged);
    const localUnread = merged.filter((alert) => !alert.is_seen).length;
    setUnreadCount((count) => Math.max(count + 1, localUnread));
  }, []));

  useSSEEventHandler<IAReportGeneratedData>('ia_report_generated', useCallback((data) => {
    const nextAlert: AlertNotification = {
      clientId: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      alert_type: data.alert_type,
      severity: normalizeSeverity(data.severity),
      title: data.title || 'IA report generated',
      message: data.message || 'A new insights report is ready.',
      link: data.link ?? null,
      created_at: data.timestamp || new Date().toISOString(),
      is_seen: false,
      source: 'sse',
    };

    const merged = mergeAlerts([nextAlert], alertsRef.current);
    setAlerts(merged);
    const localUnread = merged.filter((alert) => !alert.is_seen).length;
    setUnreadCount((count) => Math.max(count + 1, localUnread));
  }, []));

  const submitSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/admin/cases?search=${encodeURIComponent(trimmed)}`);
    setSearchQuery('');
  }, [searchQuery, router]);

  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitSearch();
    }
  }, [submitSearch]);

  return (
    /* Fluid Island — floating glass pill detached from the top edge */
    <header className="sticky top-4 z-30 mx-4 mt-4 rounded-[1.75rem] bg-[#000c24]/70 shadow-[0_12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl md:mx-6">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side: Mobile Menu Toggle & Search (optional) */}
        <div className="flex min-w-0 items-center">
          <button
            onClick={onMenuToggle}
            className="mr-3 flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.08] hover:text-white active:scale-[0.94] md:hidden"
            aria-label="Toggle mobile menu"
          >
            <FiMenu size={18} />
          </button>
          <div className="relative hidden max-w-xs flex-1 items-center rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white/[0.09] focus-within:ring-[#FFCA40]/30 md:flex">
            <FiSearch className="mr-2.5 shrink-0 text-white/40" size={15} />
            <input
              type="text"
              placeholder="Search cases…"
              className="w-full border-none bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
            <button
              type="button"
              onClick={submitSearch}
              className="ml-2 shrink-0 rounded-full bg-[#FFCA40]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FFCA40] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#FFCA40]/25 active:scale-[0.95]"
            >
              Go
            </button>
          </div>
        </div>

        {/* Right side - Notifications & Profile Dropdown */}
        <div className="flex items-center gap-2.5 md:gap-4">
          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button
                  onClick={() => {
                    if (!isLoadingAlerts) {
                      fetchAlertsRef.current?.();
                    }
                  }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94] ${
                    open ? 'bg-white/[0.1] text-white' : 'text-white/75 hover:bg-white/[0.07] hover:text-white'
                  }`}
                  aria-label="Notifications"
                >
                  <FiBell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border border-[#000c24] bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  enterFrom="transform opacity-0 scale-95 translate-y-1"
                  enterTo="transform opacity-100 scale-100 translate-y-0"
                  leave="transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-97"
                >
                  <Popover.Panel className="absolute right-0 mt-3 w-90 origin-top-right overflow-hidden rounded-[1.5rem] bg-[#020b22]/95 shadow-[0_20px_70px_-16px_rgba(0,0,0,0.65)] ring-1 ring-white/12 focus:outline-none">
                    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-3.5">
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-white">Alerts</p>
                        <p className="mt-0.5 text-xs tabular-nums text-white/45">{unreadCount} unread</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/50">
                        <span className={`h-1.5 w-1.5 rounded-full ${isLoadingAlerts || isLoadingCount ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
                        {isLoadingAlerts || isLoadingCount ? 'Updating' : 'Live'}
                      </div>
                    </div>
                    <div className="max-h-90 overflow-y-auto">
                      {isLoadingAlerts && !hasLoadedAlerts ? (
                        <div className="space-y-2 p-4">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
                          ))}
                        </div>
                      ) : alerts.length === 0 ? (
                        <div className="px-5 py-9 text-center">
                          <p className="text-sm text-white/65">No alerts yet</p>
                          <p className="mt-1 text-xs text-white/35">New notifications will appear here.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/[0.05]">
                          {alerts.map((alert) => {
                            const severity = severityStyles[alert.severity];
                            const content = (
                              <div className={`px-5 py-3.5 transition-colors duration-500 ${alert.is_seen ? 'hover:bg-white/[0.03]' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severity.dot}`} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
                                        <span className={severity.text}>{severity.label}</span>
                                        <span className="h-0.5 w-0.5 rounded-full bg-white/25" />
                                        <span className="normal-case tracking-normal">{formatAlertType(alert.alert_type)}</span>
                                      </div>
                                      <p className="mt-1 line-clamp-2 text-sm text-white">
                                        {alert.title}
                                      </p>
                                      <p className="mt-0.5 line-clamp-2 text-xs text-white/45">
                                        {alert.message}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="whitespace-nowrap text-[10px] tabular-nums text-white/35">
                                    {formatAlertTime(alert.created_at)}
                                  </span>
                                </div>
                              </div>
                            );

                            const resolvedLink = !alert.link
                              ? null
                              : alert.link.includes('/admin/insights/reports/')
                                ? '/admin/insights'
                                : alert.link;

                            if (resolvedLink) {
                              return (
                                <Link
                                  key={alert.clientId}
                                  href={resolvedLink}
                                  onClick={() => markSeenRef.current?.(alert)}
                                  className="block"
                                >
                                  {content}
                                </Link>
                              );
                            }

                            return (
                              <button
                                key={alert.clientId}
                                type="button"
                                onClick={() => markSeenRef.current?.(alert)}
                                className="w-full text-left"
                              >
                                {content}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.03] px-5 py-2.5">
                      <button
                        onClick={() => fetchAlertsRef.current?.()}
                        className="text-xs font-medium text-white/60 transition-colors duration-500 hover:text-white"
                        type="button"
                      >
                        Refresh
                      </button>
                      <Link
                        href="/admin/cases"
                        className="text-xs font-medium text-[#FFCA40]/80 transition-colors duration-500 hover:text-[#FFCA40]"
                      >
                        Open cases
                      </Link>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>

          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button className="flex items-center rounded-full p-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCA40]/50 active:scale-[0.97]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFCA40]/20 ring-1 ring-[#FFCA40]/45">
                    {profilePictureSrc !== "/default-avatar.png" ? (
                        <Image src={profilePictureSrc} alt="Admin" width={36} height={36} className="rounded-full" />
                    ) : (
                        <span className="text-sm font-semibold text-[#FFCA40]">
                        {session?.user?.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                    )}
                  </div>
                  <span className="ml-2.5 hidden text-sm text-white/85 md:inline-block">
                    {session?.user?.name || 'Administrator'}
                  </span>
                  <FiChevronDown className={`ml-1 hidden text-white/50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:inline-block ${open ? 'rotate-180 transform' : ''}`} size={14} />
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  enterFrom="transform opacity-0 scale-95 translate-y-1"
                  enterTo="transform opacity-100 scale-100 translate-y-0"
                  leave="transition duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-97"
                >
                  <Popover.Panel className="absolute right-0 mt-3 w-60 origin-top-right rounded-[1.5rem] bg-[#020b22]/95 py-2 shadow-[0_20px_70px_-16px_rgba(0,0,0,0.65)] ring-1 ring-white/12 focus:outline-none">
                    <div className="border-b border-white/[0.06] px-4 pb-3 pt-2">
                      <p className="truncate text-sm font-medium text-white">{session?.user?.name || 'Administrator'}</p>
                      <p className="truncate text-xs text-white/40">{session?.user?.email}</p>
                    </div>
                    <Link href="/admin/profile" className="flex w-full items-center px-4 py-2.5 text-sm text-white/65 transition-colors duration-500 hover:bg-white/[0.05] hover:text-[#FFCA40]">
                        <FiUser className="mr-2.5" size={15}/> Profile
                    </Link>
                    <Link href="/admin/settings" className="flex w-full items-center px-4 py-2.5 text-sm text-white/65 transition-colors duration-500 hover:bg-white/[0.05] hover:text-[#FFCA40]">
                        <FiSettings className="mr-2.5" size={15}/> Settings
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/admin' })}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm text-white/65 transition-colors duration-500 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <FiLogOut className="mr-2.5" size={15}/>
                      Sign Out
                    </button>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </div>
      </div>
       {/* Mobile Navigation Tabs - shown on smaller screens */}
       <div className="overflow-x-auto border-t border-white/[0.07] md:hidden">
        <nav className="flex space-x-1 px-2 py-1.5">
          {[{ name: 'Dashboard', icon: <FiPieChart size={16}/>, href: '/admin/dashboard' },
            { name: 'Appointments', icon: <FiCalendar size={16}/>, href: '/admin/appointments' },
            { name: 'Users', icon: <FiUsers size={16}/>, href: '/admin/users' },
            { name: 'Settings', icon: <FiSettings size={16}/>, href: '/admin/settings' }].map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center whitespace-nowrap rounded-2xl px-3 py-2 text-xs font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group ${
                  isActive
                    ? 'bg-[#FFCA40]/12 text-[#FFCA40]'
                    : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className={`mb-0.5 ${isActive ? 'text-[#FFCA40]' : 'text-white/50 group-hover:text-white/80'}`}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
