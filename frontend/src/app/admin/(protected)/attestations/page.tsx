'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/Button';
import { getAttestationMonitor } from '@/services/adminAttestationApi';
import type {
  AttestationContractTelemetry,
  AttestationMonitorResponse,
  AttestationRecordItem,
  PublishActionItem,
} from '@/types/admin/attestationMonitor';

function shortHash(value: string | null, left = 8, right = 6): string {
  if (!value) return '-';
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatSeconds(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '-';
  if (value < 60) return `${value.toFixed(1)}s`;
  return `${(value / 60).toFixed(1)}m`;
}

function statusText(status: string): string {
  return status.replaceAll('_', ' ').toUpperCase();
}

function txExplorerUrl(chainId: number | null, txHash: string | null, explorerMap: Record<number, string>): string | null {
  if (!chainId || !txHash) {
    return null;
  }
  const base = explorerMap[chainId];
  if (!base) {
    return null;
  }
  return `${base}/tx/${txHash}`;
}

function NetworkBadge({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={`${name} logo`}
          width={16}
          height={16}
          unoptimized
          className="h-4 w-4 rounded-full object-cover"
          loading="lazy"
          onError={(event) => {
            const target = event.currentTarget as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      ) : null}
      <span className="text-xs text-white/80">{name}</span>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/60">{hint}</p> : null}
    </div>
  );
}

function getCounterConsistency(item: AttestationContractTelemetry): {
  label: string;
  className: string;
  detail: string;
} {
  if (item.last_onchain_read_error) {
    return {
      label: 'ON-CHAIN READ ERROR',
      className: 'border-red-400/40 bg-red-500/10 text-red-200',
      detail: 'Cannot compare counters until RPC reads recover.',
    };
  }

  if (item.onchain_publisher_published === null) {
    return {
      label: 'UNKNOWN',
      className: 'border-white/20 bg-white/5 text-white/70',
      detail: 'On-chain publisher counter not available.',
    };
  }

  const delta = item.publish_successes - item.onchain_publisher_published;
  if (delta === 0) {
    return {
      label: 'ALIGNED',
      className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
      detail: 'Backend success count matches on-chain publisher count.',
    };
  }

  return {
    label: delta > 0 ? 'BACKEND AHEAD' : 'ON-CHAIN AHEAD',
    className: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    detail: `Counter delta: ${Math.abs(delta)}.`,
  };
}

function ContractRow({ item }: { item: AttestationContractTelemetry }) {
  const readiness = item.is_ready ? 'READY' : item.rpc_connected ? 'DEGRADED' : 'OFFLINE';
  const consistency = getCounterConsistency(item);

  return (
    <tr className="border-b border-white/5 align-top">
      <td className="px-3 py-2">
        <NetworkBadge name={item.network} logoUrl={item.network_logo_url} />
        <div className="text-xs text-white/50">Chain {item.chain_id}</div>
      </td>
      <td className="px-3 py-2">
        {item.contract_address && item.explorer_base_url ? (
          <a
            href={`${item.explorer_base_url}/address/${item.contract_address}`}
            target="_blank"
            rel="noreferrer"
            className="text-[#FFCA40] hover:underline"
          >
            {shortHash(item.contract_address, 10, 6)}
          </a>
        ) : (
          shortHash(item.contract_address)
        )}
      </td>
      <td className="px-3 py-2">{shortHash(item.publisher_address)}</td>
      <td className="px-3 py-2">{readiness}</td>
      <td className="px-3 py-2">
        {item.publish_successes} / {item.publish_attempts}
      </td>
      <td className="px-3 py-2">{item.publish_failures}</td>
      <td className="px-3 py-2">{item.onchain_publisher_published ?? '-'}</td>
      <td className="px-3 py-2">{item.onchain_total_published ?? '-'}</td>
      <td className="px-3 py-2">{formatDateTime(item.last_publish_success_at)}</td>
      <td className="px-3 py-2">{formatDateTime(item.onchain_last_published_at)}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${consistency.className}`}>
          {consistency.label}
        </span>
        <div className="mt-1 text-xs text-white/60">{consistency.detail}</div>
      </td>
      <td className="max-w-52 truncate px-3 py-2 text-xs text-white/60" title={item.last_error ?? ''}>
        {item.last_error ?? '-'}
      </td>
      <td className="max-w-52 truncate px-3 py-2 text-xs text-white/60" title={item.last_onchain_read_error ?? ''}>
        {item.last_onchain_read_error ?? '-'}
      </td>
    </tr>
  );
}

function RecordsTable({ records, explorerMap }: { records: AttestationRecordItem[]; explorerMap: Record<number, string> }) {
  if (records.length === 0) {
    return <p className="text-sm text-white/60">No attestation records available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-white/90">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
            <th className="px-3 py-2">Record</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Counselor</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Processed</th>
            <th className="px-3 py-2">Tx Hash</th>
            <th className="px-3 py-2">Error</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-white/5 align-top">
              <td className="px-3 py-2">
                <div>#{record.id}</div>
                <div className="text-xs text-white/50">Attestation {shortHash(record.attestation_id)}</div>
              </td>
              <td className="px-3 py-2">{statusText(record.status)}</td>
              <td className="px-3 py-2">{record.counselor_id}</td>
              <td className="px-3 py-2">{formatDateTime(record.created_at)}</td>
              <td className="px-3 py-2">{formatDateTime(record.processed_at)}</td>
              <td className="px-3 py-2">
                <div>{shortHash(record.tx_hash)}</div>
                {txExplorerUrl(record.chain_id, record.tx_hash, explorerMap) ? (
                  <a
                    href={txExplorerUrl(record.chain_id, record.tx_hash, explorerMap) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center rounded-md border border-[#FFCA40]/40 bg-[#FFCA40]/10 px-2 py-1 text-xs text-[#FFCA40] hover:bg-[#FFCA40]/15"
                  >
                    Open Explorer
                  </a>
                ) : null}
              </td>
              <td className="max-w-52 truncate px-3 py-2 text-xs text-white/60" title={record.last_error ?? ''}>
                {record.last_error ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionsTable({ actions, explorerMap }: { actions: PublishActionItem[]; explorerMap: Record<number, string> }) {
  if (actions.length === 0) {
    return <p className="text-sm text-white/60">No publish actions available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-white/90">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Retries</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Executed</th>
            <th className="px-3 py-2">Tx Hash</th>
            <th className="px-3 py-2">Error</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id} className="border-b border-white/5 align-top">
              <td className="px-3 py-2">
                <div>#{action.id}</div>
                <div className="text-xs text-white/50">Record {action.attestation_record_id ?? '-'}</div>
              </td>
              <td className="px-3 py-2">{statusText(action.status)}</td>
              <td className="px-3 py-2">{action.retry_count}</td>
              <td className="px-3 py-2">{formatDateTime(action.created_at)}</td>
              <td className="px-3 py-2">{formatDateTime(action.executed_at)}</td>
              <td className="px-3 py-2">
                <div>{shortHash(action.tx_hash)}</div>
                {txExplorerUrl(action.chain_id, action.tx_hash, explorerMap) ? (
                  <a
                    href={txExplorerUrl(action.chain_id, action.tx_hash, explorerMap) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center rounded-md border border-[#FFCA40]/40 bg-[#FFCA40]/10 px-2 py-1 text-xs text-[#FFCA40] hover:bg-[#FFCA40]/15"
                  >
                    Open Explorer
                  </a>
                ) : null}
              </td>
              <td className="max-w-52 truncate px-3 py-2 text-xs text-white/60" title={action.error_message ?? ''}>
                {action.error_message ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAttestationsPage() {
  const [data, setData] = useState<AttestationMonitorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAttestationMonitor(20);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attestation monitor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const queueHealthText = useMemo(() => {
    if (!data) return '-';
    const { publish_queue: queue } = data;
    if (queue.total === 0) return 'No queued publish actions yet';
    return `${queue.confirmed} confirmed · ${queue.failed + queue.dead_letter} failed/dead-letter · ${queue.queued + queue.running + queue.approved} in progress`;
  }, [data]);

  const consistencySummary = useMemo(() => {
    const counters = data?.contracts ?? [];
    const withCounters = counters.filter((item) => item.onchain_publisher_published !== null && !item.last_onchain_read_error);
    const mismatched = withCounters.filter((item) => item.publish_successes !== item.onchain_publisher_published).length;
    const readErrors = counters.filter((item) => Boolean(item.last_onchain_read_error)).length;

    if (counters.length === 0) {
      return 'No contract telemetry available yet.';
    }

    return `${mismatched} mismatch(es), ${withCounters.length - mismatched} aligned network(s), ${readErrors} RPC read error network(s).`;
  }, [data]);

  const explorerMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const contract of data?.contracts ?? []) {
      if (contract.chain_id && contract.explorer_base_url) {
        map[contract.chain_id] = contract.explorer_base_url;
      }
    }
    return map;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-linear-to-r from-white/10 via-white/5 to-transparent p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Attestation Monitor</h1>
            <p className="text-sm text-white/70">Operational view for counselor attestations from queue creation to on-chain publication.</p>
            <p className="mt-1 text-xs text-white/50">Last update: {formatDateTime(data?.generated_at ?? null)}</p>
          </div>
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-medium text-white">What this attestation means</h2>
        <div className="mt-2 space-y-2 text-sm text-white/70">
          <p>An attestation is a counselor-issued proof that a specific intervention or quest milestone happened. The system stores hashed payload evidence on-chain, while sensitive counseling context stays off-chain.</p>
          <p>Flow: counselor action creates attestation record → autopilot queues publish action → worker submits tx to BSC attestation registry → record is confirmed with tx hash and chain metadata.</p>
          <p>The contract telemetry table compares backend-pipeline counters with direct on-chain counters to reveal drifts, stale workers, or RPC read failures.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Attestations" value={String(data?.counts.total ?? 0)} hint="All records in attestation ledger" />
        <MetricCard label="Confirmed" value={String(data?.counts.confirmed ?? 0)} hint={`${data?.success_rate_percent ?? 0}% success rate`} />
        <MetricCard label="Pending + Queued" value={String((data?.counts.pending ?? 0) + (data?.counts.queued ?? 0))} hint="Not published yet" />
        <MetricCard label="Average Confirmation" value={formatSeconds(data?.avg_confirmation_seconds ?? null)} hint="Created to processed time" />
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-medium text-white">Publish Queue Health</h2>
        <p className="mt-1 text-sm text-white/60">{queueHealthText}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Queued" value={String(data?.publish_queue.queued ?? 0)} />
          <MetricCard label="Approved" value={String(data?.publish_queue.approved ?? 0)} />
          <MetricCard label="Running" value={String(data?.publish_queue.running ?? 0)} />
          <MetricCard label="Confirmed" value={String(data?.publish_queue.confirmed ?? 0)} />
          <MetricCard label="Failed" value={String(data?.publish_queue.failed ?? 0)} />
          <MetricCard label="Dead Letter" value={String(data?.publish_queue.dead_letter ?? 0)} />
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Attestation Monitor</h1>
          <p className="text-sm text-white/60">Lifecycle logs and registry-level counters.</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-medium text-white">Contract Publisher Telemetry (Backend vs On-chain)</h2>
        <p className="mt-1 text-sm text-white/60">{consistencySummary}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm text-white/90">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Contract</th>
                <th className="px-3 py-2">Publisher</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Backend Success / Attempts</th>
                <th className="px-3 py-2">Backend Failures</th>
                <th className="px-3 py-2">On-chain Publisher Count</th>
                <th className="px-3 py-2">On-chain Total</th>
                <th className="px-3 py-2">Last Backend Success</th>
                <th className="px-3 py-2">Last On-chain Publish</th>
                <th className="px-3 py-2">Consistency</th>
                <th className="px-3 py-2">Pipeline Error</th>
                <th className="px-3 py-2">On-chain Read Error</th>
              </tr>
            </thead>
            <tbody>
              {(data?.contracts ?? []).map((item) => (
                <ContractRow key={`${item.chain_id}-${item.short_name}`} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-medium text-white">Recent Attestation Records</h2>
        <div className="mt-3">
          <RecordsTable records={data?.recent_records ?? []} explorerMap={explorerMap} />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg font-medium text-white">Recent Publish Actions</h2>
        <div className="mt-3">
          <ActionsTable actions={data?.recent_publish_actions ?? []} explorerMap={explorerMap} />
        </div>
      </section>
    </div>
  );
}
