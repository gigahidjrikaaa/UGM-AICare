"use client";

import { useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiSettings, FiToggleLeft } from "react-icons/fi";
import clsx from "clsx";
import toast from "react-hot-toast";

import { apiCall } from "@/utils/adminApi";
import type {
  SystemSettingItem,
  SystemSettingsCategory,
  SystemSettingsResponse,
} from "@/types/admin/system";

export default function AdminSystemSettingsPage() {
  const [data, setData] = useState<SystemSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await apiCall<SystemSettingsResponse>('/api/v1/admin/system/settings');
        setData(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load system settings';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings().catch(() => undefined);
  }, []);

  const hasPending = useMemo(() => (
    data?.categories.some((category) =>
      category.settings.some((setting) => setting.pending),
    ) ?? false
  ), [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold text-white">
            <FiSettings className="h-7 w-7 text-[#FFCA40]" /> System Settings
          </h1>
          <p className="text-sm text-white/60">
            Review core platform configuration. Settings marked as pending display an informational alert until the underlying feature is implemented.
          </p>
        </div>
      </header>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/10 p-6 text-center text-sm text-white/60">
          Loading system settings…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {hasPending && !loading && !error && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          <FiAlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            Some configuration values are not yet connected to backend storage. They appear for planning purposes — an alert is displayed instead of editable controls.
          </div>
        </div>
      )}

      {data && !loading && !error && (
        <div className="space-y-6">
          {data.categories.map((category) => (
            <SettingsCategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsCategoryCard({ category }: { category: SystemSettingsCategory }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">{category.title}</h2>
        <p className="text-sm text-white/60">{category.description}</p>
      </div>
      <div className="space-y-4">
        {category.settings.map((setting) => (
          <div
            key={setting.key}
            className={clsx(
              "rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80",
              setting.pending && "border-yellow-500/40 bg-yellow-500/10 text-yellow-100",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-white">{setting.label}</div>
                {setting.help_text && (
                  <p className="text-xs text-white/60">{setting.help_text}</p>
                )}
              </div>
              <span className="text-xs uppercase tracking-wide text-white/40">{setting.type}</span>
            </div>
            {setting.pending ? (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <FiAlertCircle className="h-4 w-4" />
                <span>settings not yet implemented</span>
              </div>
            ) : (
              <SettingValueRenderer setting={setting} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingValueRenderer({ setting }: { setting: SystemSettingItem }) {
  if (setting.type === "badge") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#4C8BF5]/40 bg-[#4C8BF5]/10 px-3 py-1 text-xs font-semibold text-[#4C8BF5]">
        <FiToggleLeft className="h-4 w-4" />
        <span>{String(setting.value)}</span>
      </div>
    );
  }

  if (setting.type === "masked" || setting.value_preview === "masked") {
    return <div className="mt-2 text-xs text-white/50">{String(setting.value)}</div>;
  }

  if (Array.isArray(setting.value)) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {setting.value.map((item) => (
          <span key={String(item)} className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/70">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
      {String(setting.value)}
    </div>
  );
}

