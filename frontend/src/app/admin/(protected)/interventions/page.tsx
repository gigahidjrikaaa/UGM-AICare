"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from "react-hot-toast";
import {
  InterventionCampaign,
  InterventionExecution,
  InterventionOverview,
  InterventionSettings,
  ManualInterventionPayload,
  QueueItem,
} from "@/types/admin/interventions";
import { apiCall } from "@/utils/adminApi";
import { OverviewCards } from "@/components/admin/interventions/OverviewCards";
import { HighRiskList } from "@/components/admin/interventions/HighRiskList";
import { ReviewQueue } from "@/components/admin/interventions/ReviewQueue";
import { CampaignTable } from "@/components/admin/interventions/CampaignTable";
import { SettingsCard } from "@/components/admin/interventions/SettingsCard";
import { ManualInterventionDrawer } from "@/components/admin/interventions/ManualInterventionDrawer";

const CAMPAIGN_LIMIT = 50;

export default function InterventionPanelPage() {
  const [overview, setOverview] = useState<InterventionOverview | null>(null);
  const [campaigns, setCampaigns] = useState<InterventionCampaign[]>([]);
  const [queue, setQueue] = useState<InterventionExecution[]>([]);
  const [settings, setSettings] = useState<InterventionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<QueueItem | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const userIdParam = searchParams.get('prefillUserId');
    if (!userIdParam) {
      return;
    }

    const context = {
      user_id: Number(userIdParam) || undefined,
      user_name: searchParams.get('prefillUserName') ?? undefined,
      user_email: searchParams.get('prefillUserEmail') ?? undefined,
      risk_score: parseFloat(searchParams.get('prefillRisk') ?? '0') || undefined,
      severity_level: searchParams.get('prefillSeverity') ?? undefined,
      recommended_action: searchParams.get('prefillAction') ?? undefined,
      status: 'triage_escalation',
      scheduled_at: new Date().toISOString(),
    } as QueueItem;

    setDrawerContext(context);
    setDrawerOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    ['prefillUserId', 'prefillUserName', 'prefillUserEmail', 'prefillRisk', 'prefillSeverity', 'prefillAction'].forEach((key) => nextParams.delete(key));
    router.replace(nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);
  const fetchOverview = useCallback(async () => {
    const data = await apiCall<InterventionOverview>("/api/v1/admin/interventions/overview");
    setOverview(data);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignLoading(true);
    try {
      const data = await apiCall<{ items: InterventionCampaign[]; total: number }>(
        `/api/v1/admin/interventions/campaigns?limit=${CAMPAIGN_LIMIT}`,
      );
      setCampaigns(data.items);
    } finally {
      setCampaignLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const data = await apiCall<{ items: InterventionExecution[]; total: number }>(
        "/api/v1/admin/interventions/queue?limit=25",
      );
      setQueue(data.items);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const data = await apiCall<InterventionSettings>("/api/v1/admin/interventions/settings");
    setSettings(data);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchCampaigns(), fetchQueue(), fetchSettings()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load intervention data");
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchCampaigns, fetchQueue, fetchSettings]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const handleCampaignStatusChange = useCallback(
    async (campaignId: number, status: string) => {
      try {
        await apiCall(`/api/v1/admin/interventions/campaigns/${campaignId}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        toast.success("Campaign updated");
        void fetchCampaigns();
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to update campaign");
      }
    },
    [fetchCampaigns],
  );

  const handleManualSubmit = useCallback(
    async (payload: ManualInterventionPayload) => {
      try {
        await apiCall("/api/v1/admin/interventions/executions/manual", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Manual intervention scheduled");
        void Promise.all([fetchQueue(), fetchCampaigns(), fetchOverview()]);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to create intervention");
      }
    },
    [fetchCampaigns, fetchOverview, fetchQueue],
  );

  const handleExecutionUpdate = useCallback(
    async (executionId: number, status: string, notes?: string) => {
      try {
        await apiCall(`/api/v1/admin/interventions/executions/${executionId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status,
            notes,
            executed_at: status === "completed" ? new Date().toISOString() : undefined,
          }),
        });
        toast.success("Queue updated");
        void Promise.all([fetchQueue(), fetchOverview()]);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to update execution");
      }
    },
    [fetchQueue, fetchOverview],
  );

  const handleSettingsSave = useCallback(
    async (payload: Partial<InterventionSettings>) => {
      try {
        setSettingsSaving(true);
        await apiCall("/api/v1/admin/interventions/settings", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Settings saved");
        void fetchSettings();
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to update settings");
      } finally {
        setSettingsSaving(false);
      }
    },
    [fetchSettings],
  );

  const handleOpenManual = useCallback((item?: QueueItem) => {
    setDrawerContext(item ?? null);
    setDrawerOpen(true);
  }, []);

  const triageOnlyItems = useMemo(
    () => (overview?.top_risk_cases || []).filter((item) => !item.execution_id),
    [overview?.top_risk_cases],
  );


  // Handler for manual escalation from ReviewQueue
  const handleOpenManualFromExecution = useCallback((execution: QueueItem) => {
    setDrawerContext(execution);
    setDrawerOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <OverviewCards overview={overview ?? undefined} onRefresh={refreshAll} onCreateManual={() => handleOpenManual()} />

      {!loading && (
        <HighRiskList items={triageOnlyItems} onCreateIntervention={handleOpenManual} />
      )}

      <ReviewQueue executions={queue} loading={queueLoading} onUpdate={handleExecutionUpdate} onManual={handleOpenManualFromExecution} />

      <CampaignTable campaigns={campaigns} onStatusChange={handleCampaignStatusChange} loading={campaignLoading} />

      <SettingsCard settings={settings} onSave={handleSettingsSave} saving={settingsSaving} />

      <ManualInterventionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        campaigns={campaigns}
        onSubmit={handleManualSubmit}
        initialUser={drawerContext}
      />
    </div>
  );
}
