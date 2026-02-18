'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/Button';
import { getAdminContractsStatus } from '@/services/adminContractsApi';
import type { AdminContractStatusItem, AdminContractsStatusResponse } from '@/types/admin/contracts';

function shortAddress(value: string | null): string {
  if (!value) return '-';
  if (value.length < 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusBadge(ready: boolean, configured: boolean): string {
  if (!configured) return 'NOT CONFIGURED';
  if (ready) return 'READY';
  return 'DEGRADED';
}

function StatusClass(ready: boolean, configured: boolean): string {
  if (!configured) return 'text-amber-200 border-amber-200/30 bg-amber-500/10';
  if (ready) return 'text-emerald-200 border-emerald-200/30 bg-emerald-500/10';
  return 'text-red-200 border-red-200/30 bg-red-500/10';
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

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/60">{hint}</p>
    </div>
  );
}

function HeaderWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="inline-flex items-center gap-1">
      <span>{label}</span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/70"
        title={tooltip}
        aria-label={tooltip}
      >
        i
      </span>
    </div>
  );
}

function ErrorModal({
  item,
  onClose,
}: {
  item: AdminContractStatusItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-white/15 bg-[#000c24] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Contract Error Detail</h3>
            <p className="mt-1 text-xs text-white/60">{item.name} · {item.network}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs text-white/70 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Contract Address</p>
            <p className="mt-1 break-all text-white">{item.contract_address ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Publisher Address</p>
            <p className="mt-1 break-all text-white">{item.publisher_address ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">RPC Connectivity</p>
            <p className="mt-1 text-white">{item.rpc_connected ? 'Connected' : 'Disconnected'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Readiness</p>
            <p className="mt-1 text-white">{statusBadge(item.is_ready, item.is_configured)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-200/80">Error Message</p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word text-sm text-red-100">
            {item.last_error ?? 'No error details available.'}
          </pre>
        </div>

        {Object.keys(item.details ?? {}).length > 0 ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Additional Details</p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap wrap-break-word text-xs text-white/75">
              {JSON.stringify(item.details, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminContractsPage() {
  const [data, setData] = useState<AdminContractsStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModalItem, setErrorModalItem] = useState<AdminContractStatusItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminContractsStatus();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load smart contract status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const items = data?.contracts ?? [];
    return {
      token: items.filter((item) => item.category === 'token'),
      badge: items.filter((item) => item.category === 'badge'),
      attestation: items.filter((item) => item.category === 'attestation'),
    };
  }, [data]);

  const totalContracts = data?.contracts.length ?? 0;
  const readyContracts = (data?.contracts ?? []).filter((item) => item.is_ready).length;
  const degradedContracts = (data?.contracts ?? []).filter((item) => item.is_configured && !item.is_ready).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-linear-to-r from-[#FFCA40]/15 via-white/8 to-transparent p-5 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Smart Contracts</h1>
            <p className="text-sm text-white/70">Monitor contract readiness, RPC health, and publisher wallet state across supported chains.</p>
            <p className="mt-1 text-xs text-white/50">
              Overall status: <span className="font-medium text-white">{data?.status ?? '-'}</span>
            </p>
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Tracked Contracts" value={String(totalContracts)} hint="Token, badge, and attestation registries" />
        <SummaryCard label="Ready" value={String(readyContracts)} hint="Fully configured and connected" />
        <SummaryCard label="Degraded" value={String(degradedContracts)} hint="Configured but not currently ready" />
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Registry Status Tables</h2>
          <p className="text-sm text-white/60">Click contract addresses to open explorer pages when available.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-white/10 bg-linear-to-b from-white/8 to-white/5 p-4 shadow-lg shadow-black/15">
        <h2 className="text-lg font-medium text-white">Attestation Registries</h2>
        <ContractsTable items={grouped.attestation} loading={loading} onOpenError={setErrorModalItem} />
      </section>

      <section className="rounded-xl border border-white/10 bg-linear-to-b from-white/8 to-white/5 p-4 shadow-lg shadow-black/15">
        <h2 className="text-lg font-medium text-white">Badge Registries</h2>
        <ContractsTable items={grouped.badge} loading={loading} onOpenError={setErrorModalItem} />
      </section>

      <section className="rounded-xl border border-white/10 bg-linear-to-b from-white/8 to-white/5 p-4 shadow-lg shadow-black/15">
        <h2 className="text-lg font-medium text-white">Token Contracts</h2>
        <ContractsTable items={grouped.token} loading={loading} onOpenError={setErrorModalItem} />
      </section>

      <ErrorModal item={errorModalItem} onClose={() => setErrorModalItem(null)} />
    </div>
  );
}

function ContractsTable({
  items,
  loading,
  onOpenError,
}: {
  items: AdminContractStatusItem[];
  loading: boolean;
  onOpenError: (item: AdminContractStatusItem) => void;
}) {
  if (!loading && items.length === 0) {
    return <p className="mt-3 text-sm text-white/60">No contracts found in this category.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-sm text-white/90">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
            <th className="px-3 py-2"><HeaderWithTooltip label="Contract" tooltip="Contract name and category tracked by admin monitoring." /></th>
            <th className="px-3 py-2"><HeaderWithTooltip label="Network" tooltip="Blockchain network where this contract is expected to run (with chain id)." /></th>
            <th className="px-3 py-2"><HeaderWithTooltip label="Address" tooltip="Deployed contract address. Click to open explorer address page when available." /></th>
            <th className="px-3 py-2"><HeaderWithTooltip label="Publisher" tooltip="Wallet used by backend for privileged contract actions (mint/publish)." /></th>
            <th className="px-3 py-2"><HeaderWithTooltip label="RPC" tooltip="Current connectivity status to the configured RPC endpoint." /></th>
            <th className="px-3 py-2"><HeaderWithTooltip label="Status" tooltip="Readiness derived from configuration presence plus live RPC/contract accessibility." /></th>
            <th className="px-3 py-2"><HeaderWithTooltip label="Error" tooltip="Latest backend error while checking or using this contract. Click to view full details." /></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className="border-b border-white/5 align-top transition-colors hover:bg-white/5">
              <td className="px-3 py-2">
                <div className="font-medium text-white">{item.name}</div>
                <div className="text-xs text-white/50">{item.category}</div>
              </td>
              <td className="px-3 py-2">
                <NetworkBadge name={item.network} logoUrl={item.network_logo_url} />
                <div className="text-xs text-white/50">{item.chain_id ? `Chain ${item.chain_id}` : '-'}</div>
              </td>
              <td className="px-3 py-2">
                {item.contract_address ? (
                  item.explorer_base_url ? (
                    <a
                      href={`${item.explorer_base_url}/address/${item.contract_address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FFCA40] hover:underline"
                    >
                      {shortAddress(item.contract_address)}
                    </a>
                  ) : (
                    shortAddress(item.contract_address)
                  )
                ) : (
                  '-'
                )}
              </td>
              <td className="px-3 py-2">{shortAddress(item.publisher_address)}</td>
              <td className="px-3 py-2">{item.rpc_connected ? 'Connected' : 'Disconnected'}</td>
              <td className="px-3 py-2">
                <span className={`rounded-md border px-2 py-1 text-xs ${StatusClass(item.is_ready, item.is_configured)}`}>
                  {statusBadge(item.is_ready, item.is_configured)}
                </span>
              </td>
              <td className="max-w-65 truncate px-3 py-2 text-xs text-white/60" title={item.last_error ?? ''}>
                {item.last_error ? (
                  <button
                    onClick={() => onOpenError(item)}
                    className="rounded-md border border-red-300/30 bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                  >
                    View Error
                  </button>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
