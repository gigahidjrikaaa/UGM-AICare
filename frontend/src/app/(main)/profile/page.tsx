"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { Switch } from "@headlessui/react";
import {
  FiActivity,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiCopy,
  FiCreditCard,
  FiEdit3,
  FiGlobe,
  FiKey,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiXCircle,
  FiMail,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import { format } from "date-fns";

import GlobalSkeleton from "@/components/ui/GlobalSkeleton";
import ParticleBackground from "@/components/ui/ParticleBackground";
import apiClient, { fetchUserProfileOverview, updateUserProfileOverview } from "@/services/api";
import type { TimelineEntry, UserProfileOverviewResponse, UserProfileOverviewUpdate } from "@/types/profile";



type ProfileFormState = {
  preferred_name: string;
  pronouns: string;
  profile_photo_url: string;
  city: string;
  university: string;
  major: string;
  year_of_study: string;
  phone: string;
  alternate_phone: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contact_email: string;
  risk_level: string;
  clinical_summary: string;
  primary_concerns: string;
  safety_plan_notes: string;
  current_therapist_name: string;
  current_therapist_contact: string;
  therapy_modality: string;
  therapy_frequency: string;
  therapy_notes: string;
  preferred_language: string;
  preferred_timezone: string;
  accessibility_needs: string;
  communication_preferences: string;
  interface_preferences: string;
  consent_data_sharing: boolean;
  consent_research: boolean;
  consent_emergency_contact: boolean;
  consent_marketing: boolean;
};

const timelineIcons: Record<string, JSX.Element> = {
  journal: <FiBookOpen className="h-4 w-4" />,
  conversation: <FiMessageCircle className="h-4 w-4" />,
  appointment: <FiCalendar className="h-4 w-4" />,
  badge: <FiAward className="h-4 w-4" />,
};
const inputBaseClass =
  "w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#FFCA40] focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/40";
const textareaBaseClass =
  "w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#FFCA40] focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/40";

function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: JSX.Element;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#FFCA40]">{icon}</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="space-y-4 text-sm text-white/80">{children}</div>
    </section>
  );
}

function TimelineList({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) {
    return (
      <p className="text-white/60">
        No activity recorded yet. Your first journal entry or conversation will appear here.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        const icon = timelineIcons[entry.kind] ?? <FiActivity className="h-4 w-4" />;
        const timestamp = format(new Date(entry.timestamp), "PPpp");
        return (
          <li
            key={`${entry.kind}-${entry.timestamp}`}
            className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFCA40]/10 text-[#FFCA40]">
              {icon}
            </div>
            <div>
              <p className="font-medium text-white">{entry.title}</p>
              {entry.description && <p className="text-sm text-white/70">{entry.description}</p>}
              <p className="mt-2 text-xs uppercase tracking-wide text-white/40">{timestamp}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}


function mapProfileToForm(profile: UserProfileOverviewResponse): ProfileFormState {
  return {
    preferred_name: profile.header.preferred_name ?? "",
    pronouns: profile.header.pronouns ?? "",
    profile_photo_url: profile.header.profile_photo_url ?? "",
    city: profile.header.city ?? "",
    university: profile.header.university ?? "",
    major: profile.header.major ?? "",
    year_of_study: profile.header.year_of_study ?? "",
    phone: profile.contact.phone ?? "",
    alternate_phone: profile.contact.alternate_phone ?? "",
    emergency_contact_name: profile.contact.emergency_contact?.name ?? "",
    emergency_contact_relationship: profile.contact.emergency_contact?.relationship ?? "",
    emergency_contact_phone: profile.contact.emergency_contact?.phone ?? "",
    emergency_contact_email: profile.contact.emergency_contact?.email ?? "",
    risk_level: profile.safety.risk_level ?? "",
    clinical_summary: profile.safety.clinical_summary ?? "",
    primary_concerns: profile.safety.primary_concerns ?? "",
    safety_plan_notes: profile.safety.safety_plan_notes ?? "",
    current_therapist_name: profile.therapy.current_therapist_name ?? "",
    current_therapist_contact: profile.therapy.current_therapist_contact ?? "",
    therapy_modality: profile.therapy.therapy_modality ?? "",
    therapy_frequency: profile.therapy.therapy_frequency ?? "",
    therapy_notes: profile.therapy.therapy_notes ?? "",
    preferred_language: profile.localization.preferred_language ?? "",
    preferred_timezone: profile.localization.preferred_timezone ?? "",
    accessibility_needs: profile.localization.accessibility_needs ?? "",
    communication_preferences: profile.localization.communication_preferences ?? "",
    interface_preferences: profile.localization.interface_preferences ?? "",
    consent_data_sharing: profile.consent.consent_data_sharing,
    consent_research: profile.consent.consent_research,
    consent_emergency_contact: profile.consent.consent_emergency_contact,
    consent_marketing: profile.consent.consent_marketing,
  };
}

const toNullableString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const buildUpdatePayload = (state: ProfileFormState): UserProfileOverviewUpdate => ({
  preferred_name: toNullableString(state.preferred_name),
  pronouns: toNullableString(state.pronouns),
  profile_photo_url: toNullableString(state.profile_photo_url),
  phone: toNullableString(state.phone),
  alternate_phone: toNullableString(state.alternate_phone),
  emergency_contact_name: toNullableString(state.emergency_contact_name),
  emergency_contact_relationship: toNullableString(state.emergency_contact_relationship),
  emergency_contact_phone: toNullableString(state.emergency_contact_phone),
  emergency_contact_email: toNullableString(state.emergency_contact_email),
  risk_level: toNullableString(state.risk_level),
  clinical_summary: toNullableString(state.clinical_summary),
  primary_concerns: toNullableString(state.primary_concerns),
  safety_plan_notes: toNullableString(state.safety_plan_notes),
  current_therapist_name: toNullableString(state.current_therapist_name),
  current_therapist_contact: toNullableString(state.current_therapist_contact),
  therapy_modality: toNullableString(state.therapy_modality),
  therapy_frequency: toNullableString(state.therapy_frequency),
  therapy_notes: toNullableString(state.therapy_notes),
  preferred_language: toNullableString(state.preferred_language),
  preferred_timezone: toNullableString(state.preferred_timezone),
  accessibility_needs: toNullableString(state.accessibility_needs),
  communication_preferences: toNullableString(state.communication_preferences),
  interface_preferences: toNullableString(state.interface_preferences),
  city: toNullableString(state.city),
  university: toNullableString(state.university),
  major: toNullableString(state.major),
  year_of_study: toNullableString(state.year_of_study),
  consent_data_sharing: state.consent_data_sharing,
  consent_research: state.consent_research,
  consent_emergency_contact: state.consent_emergency_contact,
  consent_marketing: state.consent_marketing,
});


export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfileOverviewResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [allowCheckins, setAllowCheckins] = useState(true);
  const [isSavingCheckinSetting, setIsSavingCheckinSetting] = useState(false);
  const [checkinSettingError, setCheckinSettingError] = useState<string | null>(null);

  const [showQr, setShowQr] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [form, setForm] = useState<ProfileFormState | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/profile");
    }
  }, [router, status]);

  useEffect(() => {
    if (!profile) {
      setAllowCheckins(
        (session?.user as { allow_email_checkins?: boolean })?.allow_email_checkins ?? true,
      );
    }
  }, [profile, session?.user]);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await fetchUserProfileOverview();
      setProfile(data);
      setAllowCheckins(data.consent.allow_email_checkins);
      setForm(mapProfileToForm(data));
    } catch (error) {
      console.error("Failed to load profile overview", error);
      setProfileError(
        "We could not load your profile information. Please try again shortly.",
      );
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchProfile();
    }
  }, [fetchProfile, status]);

  const handleCheckinToggle = async (enabled: boolean) => {
    setAllowCheckins(enabled);
    setIsSavingCheckinSetting(true);
    setCheckinSettingError(null);

    try {
      await apiClient.put("/profile/settings/checkins", { allow_email_checkins: enabled });
      toast.success(enabled ? "Email check-ins enabled" : "Email check-ins disabled");
    } catch (error) {
      console.error("Failed to update check-in preference", error);
      setCheckinSettingError("Could not update your preference. Please try again.");
      setAllowCheckins((prev) => !prev);
    } finally {
      setIsSavingCheckinSetting(false);
    }
  };

  const handleCopyCheckInCode = async () => {
    if (!profile?.header.check_in_code) {
      return;
    }
    try {
      await navigator.clipboard.writeText(profile.header.check_in_code);
      toast.success("Check-in code copied to clipboard");
    } catch (error) {
      console.error("Failed to copy check-in code", error);
      toast.error("Unable to copy check-in code");
    }
  };

  const updateFormField = useCallback((field: keyof ProfileFormState, value: ProfileFormState[keyof ProfileFormState]) => {
    setForm((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [field]: value,
      } as ProfileFormState;
    });
  }, []);

  const handleEnterEditMode = () => {
    if (!profile) {
      return;
    }
    setForm(mapProfileToForm(profile));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setForm(mapProfileToForm(profile));
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!profile || !form) {
      return;
    }
    setIsSavingProfile(true);
    try {
      const payload = buildUpdatePayload(form);
      const updated = await updateUserProfileOverview(payload);
      setProfile(updated);
      setForm(mapProfileToForm(updated));
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Could not save your profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const headerImageSrc = useMemo(() => {
    if (!profile) {
      return "/default-avatar.png";
    }
    if (isEditing && form) {
      return form.profile_photo_url.trim() || profile.header.avatar_url || "/default-avatar.png";
    }
    return profile.header.profile_photo_url || profile.header.avatar_url || "/default-avatar.png";
  }, [form, isEditing, profile]);

  const academicSummary = useMemo(() => {
    if (!profile) {
      return "Here is your wellbeing journey overview.";
    }
    const source = isEditing && form ? form : null;
    const year = (source ? source.year_of_study : profile.header.year_of_study)?.trim();
    const major = (source ? source.major : profile.header.major)?.trim();
    const parts: string[] = [];
    if (year) {
      parts.push(`Class of ${year}`);
    }
    if (major) {
      parts.push(major);
    }
    return parts.length ? parts.join(' • ') : 'Here is your wellbeing journey overview.';
  }, [form, isEditing, profile]);

  const headerMetrics = useMemo(() => {
    if (!profile)
      return [] as Array<{ label: string; value: string; icon: JSX.Element }>;
    return [
      {
        label: "Current Streak",
        value: `${profile.header.current_streak} days`,
        icon: <FiTrendingUp className="h-4 w-4" />,
      },
      {
        label: "Longest Streak",
        value: `${profile.header.longest_streak} days`,
        icon: <FiActivity className="h-4 w-4" />,
      },
      {
        label: "Sentiment",
        value: profile.header.sentiment_score.toFixed(2),
        icon: <FiShield className="h-4 w-4" />,
      },
    ];
  }, [profile]);

  if (status === "loading" || profileLoading) {
    return (
      <div className="relative min-h-screen pt-16">
        <ParticleBackground />
        <div className="relative z-10">
          <GlobalSkeleton />
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white shadow-2xl backdrop-blur">
          <FiXCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-white/70">{profileError}</p>
          <button
            onClick={() => fetchProfile()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFCA40] px-6 py-2 text-sm font-semibold text-[#001D58] transition hover:bg-[#ffd45c]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!profile || !form) {
    return null;
  }

  const firstName = (isEditing ? form.preferred_name : profile.header.preferred_name) ?? profile.header.full_name ?? "Friend";

  return (
    <div className="relative min-h-screen">
      <ParticleBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-24">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/30">
                <Image
                  src={headerImageSrc}
                  alt={profile.header.full_name || "Profile"}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">
                    {profile.header.full_name || firstName}
                  </h1>
                  {(profile.header.pronouns || form.pronouns.trim()) && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
                      {isEditing ? form.pronouns || profile.header.pronouns : profile.header.pronouns}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {academicSummary}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/60">
                  {profile.header.age !== null && profile.header.age !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <FiUsers className="h-3 w-3" /> {profile.header.age} years old
                    </span>
                  )}
                  {(profile.header.city || form.city.trim()) && (
                    <span className="inline-flex items-center gap-1">
                      <FiMapPin className="h-3 w-3" /> {isEditing ? form.city || profile.header.city : profile.header.city}
                    </span>
                  )}
                  {(profile.header.university || form.university.trim()) && (
                    <span className="inline-flex items-center gap-1">
                      <FiGlobe className="h-3 w-3" /> {isEditing ? form.university || profile.header.university : profile.header.university}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <div className="mt-4 grid gap-4 text-sm text-white/80 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Preferred name</p>
                      <input
                        value={form.preferred_name}
                        onChange={(event) => updateFormField("preferred_name", event.target.value)}
                        className={inputBaseClass}
                        placeholder="Preferred name"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Pronouns</p>
                      <input
                        value={form.pronouns}
                        onChange={(event) => updateFormField("pronouns", event.target.value)}
                        className={inputBaseClass}
                        placeholder="e.g. she/her"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Profile photo URL</p>
                      <input
                        value={form.profile_photo_url}
                        onChange={(event) => updateFormField("profile_photo_url", event.target.value)}
                        className={inputBaseClass}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">City / Location</p>
                      <input
                        value={form.city}
                        onChange={(event) => updateFormField("city", event.target.value)}
                        className={inputBaseClass}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">University</p>
                      <input
                        value={form.university}
                        onChange={(event) => updateFormField("university", event.target.value)}
                        className={inputBaseClass}
                        placeholder="University"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Major</p>
                      <input
                        value={form.major}
                        onChange={(event) => updateFormField("major", event.target.value)}
                        className={inputBaseClass}
                        placeholder="Major"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">Year of study</p>
                      <input
                        value={form.year_of_study}
                        onChange={(event) => updateFormField("year_of_study", event.target.value)}
                        className={inputBaseClass}
                        placeholder="2026"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">Live check-in ID</p>
                  <p className="mt-1 text-lg font-semibold">
                    {profile.header.check_in_code.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={handleCopyCheckInCode}
                  className="rounded-full border border-white/20 p-2 text-white/80 transition hover:border-[#FFCA40] hover:text-[#FFCA40]"
                  title="Copy check-in code"
                >
                  <FiCopy className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setShowQr((prev) => !prev)}
                className="mt-4 w-full rounded-full bg-[#FFCA40] py-2 text-sm font-semibold text-[#001D58] transition hover:bg-[#ffd45c]"
              >
                {showQr ? "Hide QR" : "Show QR Code"}
              </button>
              {showQr && (
                <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
                  <QRCode value={profile.header.check_in_code} className="h-28 w-28" />
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {headerMetrics.map((metric) => (
              <div
                key={metric.label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              >
                <span className="rounded-full bg-[#FFCA40]/10 p-2 text-[#FFCA40]">
                  {metric.icon}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">{metric.label}</p>
                  <p className="text-lg font-semibold">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SectionCard title="Contacts" icon={<FiPhone className="h-5 w-5" />}>
              <div className="grid gap-4 text-sm text-white/80 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-[#FFCA40]">
                    <FiMail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Primary email</p>
                    <p>{profile.contact.primary_email ?? "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-[#FFCA40]">
                    <FiPhone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Primary phone</p>
                    <p>{profile.contact.phone ?? "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-[#FFCA40]">
                    <FiPhone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Alternate phone</p>
                    <p>{profile.contact.alternate_phone ?? "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-[#FFCA40]">
                    <FiCreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Wallet address</p>
                    <p>{profile.header.wallet_address ? `${profile.header.wallet_address.slice(0, 6)}...${profile.header.wallet_address.slice(-4)}` : "Not linked"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-[#FFCA40]">
                    <FiKey className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Digital ID</p>
                    <p>{profile.header.google_sub ?? "Not linked"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-[#FFCA40]">
                    <FiUsers className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Emergency contact</p>
                    {profile.contact.emergency_contact ? (
                      <ul className="space-y-1 text-sm">
                        <li>{profile.contact.emergency_contact.name}</li>
                        <li className="text-white/60">
                          {profile.contact.emergency_contact.relationship}
                        </li>
                        {profile.contact.emergency_contact.phone && (
                          <li>{profile.contact.emergency_contact.phone}</li>
                        )}
                        {profile.contact.emergency_contact.email && (
                          <li>{profile.contact.emergency_contact.email}</li>
                        )}
                      </ul>
                    ) : (
                      <p>No emergency contact on file.</p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Safety & Clinical Basics" icon={<FiShield className="h-5 w-5" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Risk level</p>
                  <p>{profile.safety.risk_level ?? "Not assessed"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Primary concerns</p>
                  <p>{profile.safety.primary_concerns ?? "Add the areas you want to focus on"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-white/50">Clinical summary</p>
                  <p>
                    {profile.safety.clinical_summary ??
                      "We will summarise key clinical notes here once available."}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-white/50">Safety plan notes</p>
                  <p>
                    {profile.safety.safety_plan_notes ??
                      "Use this space to capture any safety plans agreed with your therapist or support team."}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Previous & Assigned Therapy" icon={<FiUsers className="h-5 w-5" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Therapist</p>
                  <p>{profile.therapy.current_therapist_name ?? "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Therapist contact</p>
                  <p>{profile.therapy.current_therapist_contact ?? "Not available"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Therapy modality</p>
                  <p>{profile.therapy.therapy_modality ?? "Pending"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Session cadence</p>
                  <p>{profile.therapy.therapy_frequency ?? "Not set"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-white/50">Notes</p>
                  <p>
                    {profile.therapy.therapy_notes ??
                      "AICare will highlight helpful therapy notes here once available."}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Activity timeline" icon={<FiActivity className="h-5 w-5" />}>
              <TimelineList entries={profile.timeline} />
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Consent & Privacy"
              icon={<FiCheckCircle className="h-5 w-5" />}
              action={
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>Email check-ins</span>
                  <Switch
                    checked={allowCheckins}
                    onChange={handleCheckinToggle}
                    disabled={isSavingCheckinSetting}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/80 focus:ring-offset-2 focus:ring-offset-gray-900",
                      allowCheckins ? "bg-[#FFCA40]" : "bg-gray-600",
                      isSavingCheckinSetting && "opacity-70",
                    )}
                  >
                    <span className="sr-only">Toggle email check-ins</span>
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition",
                        allowCheckins ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </Switch>
                </div>
              }
            >
              {checkinSettingError && <p className="text-xs text-red-400">{checkinSettingError}</p>}
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  {profile.consent.consent_data_sharing ? (
                    <FiCheckCircle className="text-emerald-400" />
                  ) : (
                    <FiXCircle className="text-red-400" />
                  )}
                  <span>Share anonymised insights to improve AICare</span>
                </li>
                <li className="flex items-center gap-2">
                  {profile.consent.consent_research ? (
                    <FiCheckCircle className="text-emerald-400" />
                  ) : (
                    <FiXCircle className="text-red-400" />
                  )}
                  <span>Participate in wellbeing research studies</span>
                </li>
                <li className="flex items-center gap-2">
                  {profile.consent.consent_emergency_contact ? (
                    <FiCheckCircle className="text-emerald-400" />
                  ) : (
                    <FiXCircle className="text-red-400" />
                  )}
                  <span>Allow AICare to reach your emergency contact when needed</span>
                </li>
                <li className="flex items-center gap-2">
                  {profile.consent.consent_marketing ? (
                    <FiCheckCircle className="text-emerald-400" />
                  ) : (
                    <FiXCircle className="text-red-400" />
                  )}
                  <span>Receive wellbeing updates and programme invitations</span>
                </li>
              </ul>
            </SectionCard>

            <SectionCard
              title="Localization & accessibility"
              icon={<FiGlobe className="h-5 w-5" />}
            >
              <div className="space-y-3 text-sm text-white/80">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Preferred language</p>
                  <p>{profile.localization.preferred_language ?? "English"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Timezone</p>
                  <p>{profile.localization.preferred_timezone ?? "Asia/Jakarta"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Accessibility notes</p>
                  <p>
                    {profile.localization.accessibility_needs ??
                      "Let us know what helps you engage comfortably."}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Preferred communication</p>
                  <p>{profile.localization.communication_preferences ?? "Email & in-app messages"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Interface preferences</p>
                  <p>{profile.localization.interface_preferences ?? "Standard experience"}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="AICare team notes" icon={<FiSliders className="h-5 w-5" />}>
              <p className="leading-relaxed text-white/80">
                {profile.aicare_team_notes ??
                  "Internal reflections and next steps from the AICare support team will appear here. These stay private to the clinical team."}
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
