'use client';

/**
 * Peer Support — student-facing hub for interpersonal chat.
 *
 * Tabs:
 * - "Peer Supporter": the supervised peer-support program (1-on-1 pairing
 *   + moderated circles).
 * - "Counselor": direct 1-on-1 messaging with a professional counselor.
 *
 * Both threads are persisted redacted server-side, delivered live via SSE
 * (`peer_message`), crisis-screened on send, and use the shared ChatThread
 * component for the golden-standard messaging UX.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiMessageSquare,
  FiUsers,
} from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import { PageSpinner } from '@/components/ui/admin/kit';
import ChatThread, { type ChatThreadMessage } from '@/components/ui/admin/ChatThread';
import { useSSE } from '@/hooks/useSSE';
import {
  closePairing,
  closeCounselingThread,
  createCounselorThread,
  getCounselingMessages,
  getCircleMessages,
  getMyPairing,
  getMyUnreadCounts,
  getPeerConsent,
  getPairingMessages,
  joinPeerCircle,
  leavePeerCircle,
  listPeerCircles,
  requestPeerSupport,
  sendCircleMessage,
  sendCounselingMessage,
  sendPairingMessage,
  setPeerConsent,
  type PeerCircleInfo,
  type PeerMessage,
  type PeerPairing,
} from '@/services/peerSupportApi';

type Tab = 'peer' | 'counselor';
type ThreadKind = 'pairing' | { circleId: number };

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function PeerSupportPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id != null ? Number(session.user.id) : undefined;

  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [pairing, setPairing] = useState<PeerPairing | null>(null);
  const [circles, setCircles] = useState<PeerCircleInfo[]>([]);
  const [unread, setUnread] = useState({ pairing: 0, counseling: 0 });
  const [requesting, setRequesting] = useState(false);
  const [tab, setTab] = useState<Tab>('peer');

  // Peer pairing thread
  const [peerThread, setPeerThread] = useState(false);
  const [peerMessages, setPeerMessages] = useState<PeerMessage[]>([]);
  const [peerLoading, setPeerLoading] = useState(false);

  // Counselor thread
  const [counselorThreadId, setCounselorThreadId] = useState<number | null>(null);
  const [counselorMessages, setCounselorMessages] = useState<PeerMessage[]>([]);
  const [counselorLoading, setCounselorLoading] = useState(false);

  const [sending, setSending] = useState(false);
  const [crisisFlagged, setCrisisFlagged] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadInitial = useCallback(async () => {
    try {
      const [consentData, pairingData, circleData, unreadData] = await Promise.all([
        getPeerConsent().catch(() => null),
        getMyPairing().catch(() => null),
        listPeerCircles().catch(() => []),
        getMyUnreadCounts().catch(() => ({ pairing: 0, counseling: 0 })),
      ]);
      setConsent(consentData?.consent_peer_support ?? false);
      setPairing(pairingData?.pairing ?? null);
      setCircles(circleData);
      setUnread(unreadData);
      if (pairingData?.pairing) setPeerThread(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const peerChatMessages: ChatThreadMessage[] = useMemo(
    () =>
      peerMessages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        crisisFlagged: m.crisis_flagged,
      })),
    [peerMessages],
  );

  const counselorChatMessages: ChatThreadMessage[] = useMemo(
    () =>
      counselorMessages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        crisisFlagged: m.crisis_flagged,
      })),
    [counselorMessages],
  );

  const loadPeerMessages = useCallback(async () => {
    if (!pairing) return;
    setPeerLoading(true);
    try {
      setPeerMessages(await getPairingMessages(pairing.id));
    } catch {
      /* silent — thread shows empty */
    } finally {
      setPeerLoading(false);
    }
  }, [pairing]);

  const loadCounselorMessages = useCallback(async () => {
    if (counselorThreadId === null) return;
    setCounselorLoading(true);
    try {
      setCounselorMessages(await getCounselingMessages(counselorThreadId));
    } catch {
      /* silent */
    } finally {
      setCounselorLoading(false);
    }
  }, [counselorThreadId]);

  useEffect(() => {
    if (peerThread && pairing) void loadPeerMessages();
  }, [peerThread, pairing, loadPeerMessages]);

  useEffect(() => {
    if (counselorThreadId !== null) void loadCounselorMessages();
  }, [counselorThreadId, loadCounselorMessages]);

  // Live delivery via the user-scoped SSE channel
  useSSE({
    url: '/api/v1/sse/events',
    eventTypes: ['peer_message'],
    onEvent: useCallback(
      (event: { type: string; data: unknown }) => {
        const data = (event.data ?? {}) as Record<string, unknown>;
        const incoming: PeerMessage = {
          id: Number(data.message_id),
          sender_id: Number(data.sender_id),
          content: String(data.content ?? ''),
          created_at: String(data.created_at ?? new Date().toISOString()),
        };
        const threadType = String(data.thread_type ?? '');
        const threadId = Number(data.thread_id);
        if (threadType === 'pairing' && peerThread && pairing && threadId === pairing.id) {
          setPeerMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        }
        if (
          threadType === 'counseling' &&
          counselorThreadId !== null &&
          threadId === counselorThreadId
        ) {
          setCounselorMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        }
      },
      [peerThread, pairing, counselorThreadId],
    ),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [peerMessages, counselorMessages]);

  const handleRequestSupport = async () => {
    setRequesting(true);
    try {
      const result = await requestPeerSupport();
      setPairing(result.pairing);
      setPeerThread(true);
      setTab('peer');
      toast.success('Terhubung dengan peer supporter. Tulis pesan pertamamu!');
    } catch (error) {
      const detail =
        typeof error === 'object' && error !== null && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      toast.error(detail || 'Belum ada peer supporter yang tersedia. Coba lagi nanti.');
    } finally {
      setRequesting(false);
    }
  };

  const handleStartCounselorChat = async () => {
    setSending(true);
    try {
      const thread = await createCounselorThread();
      setCounselorThreadId(thread.id);
      setTab('counselor');
      await loadCounselorMessages();
      toast.success('Thread dengan konselor siap');
    } catch (error) {
      const detail =
        typeof error === 'object' && error !== null && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      toast.error(detail || 'Belum ada konselor yang tersedia. Coba lagi nanti.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleConsent = async () => {
    try {
      const result = await setPeerConsent(!consent);
      setConsent(result.consent_peer_support);
      toast.success(result.consent_peer_support ? 'Peer support diaktifkan' : 'Peer support dimatikan');
    } catch {
      toast.error('Gagal mengubah pengaturan');
    }
  };

  const handleJoinCircle = async (circle: PeerCircleInfo) => {
    try {
      const updated = circle.is_member
        ? await leavePeerCircle(circle.id)
        : await joinPeerCircle(circle.id);
      setCircles((prev) => prev.map((c) => (c.id === circle.id ? updated : c)));
    } catch (error) {
      const detail =
        typeof error === 'object' && error !== null && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      toast.error(detail || 'Gagal mengubah keanggotaan');
    }
  };

  const sendPeerMessage = async (content: string): Promise<ChatThreadMessage | null> => {
    if (!pairing) return null;
    try {
      const sent = await sendPairingMessage(pairing.id, content);
      if (sent.crisis_flagged) setCrisisFlagged(true);
      return {
        id: sent.id,
        senderId: sent.sender_id,
        content: sent.content,
        createdAt: sent.created_at,
        crisisFlagged: sent.crisis_flagged,
      };
    } catch {
      return null;
    }
  };

  const sendToCounselor = async (content: string): Promise<ChatThreadMessage | null> => {
    if (counselorThreadId === null) return null;
    try {
      const sent = await sendCounselingMessage(counselorThreadId, content);
      if (sent.crisis_flagged) setCrisisFlagged(true);
      return {
        id: sent.id,
        senderId: sent.sender_id,
        content: sent.content,
        createdAt: sent.created_at,
        crisisFlagged: sent.crisis_flagged,
      };
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageSpinner label="Memuat pesan…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <FiArrowLeft /> Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-foreground">Pesan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chat dengan peer supporter terlatih atau langsung dengan konselor.
          </p>
        </motion.header>

        {/* Consent gate */}
        {!consent ? (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Aktifkan pesan interpersonal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Aktifkan untuk chat dengan peer supporter terlatih atau konselor. Percakapan
              disaring otomatis untuk bahasa krisis; peer support diawasi konselor pembimbing.
            </p>
            <button
              type="button"
              onClick={handleToggleConsent}
              className="mt-5 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#00153a] transition-opacity hover:opacity-90"
            >
              Aktifkan
            </button>
          </section>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2" role="tablist" aria-label="Jenis pesan">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'peer'}
                onClick={() => setTab('peer')}
                className={`relative inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  tab === 'peer'
                    ? 'border-[#FFCA40] bg-[#FFCA40] text-[#00153a]'
                    : 'border-border bg-card text-muted-foreground hover:border-[#FFCA40]/50 hover:text-foreground'
                }`}
              >
                <FiUsers className="h-4 w-4" /> Peer Supporter
                {unread.pairing > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unread.pairing}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'counselor'}
                onClick={() => setTab('counselor')}
                className={`relative inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  tab === 'counselor'
                    ? 'border-[#FFCA40] bg-[#FFCA40] text-[#00153a]'
                    : 'border-border bg-card text-muted-foreground hover:border-[#FFCA40]/50 hover:text-foreground'
                }`}
              >
                <FiMessageSquare className="h-4 w-4" /> Konselor
                {unread.counseling > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unread.counseling}
                  </span>
                )}
              </button>
            </div>

            {/* ===== Peer Supporter tab ===== */}
            {tab === 'peer' && (
              <section className="mt-5">
                {pairing && pairing.status === 'active' ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {pairing.supporter?.name ?? 'Peer supporter'}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await closePairing(pairing.id);
                          setPairing(result.pairing);
                          setPeerThread(false);
                          toast('Percakapan ditutup');
                        }}
                        className="text-xs text-muted-foreground underline transition hover:text-foreground"
                      >
                        Tutup percakapan
                      </button>
                    </div>
                    <div className="h-[460px]">
                      <ChatThread
                        messages={peerChatMessages}
                        currentUserId={currentUserId}
                        onSend={sendPeerMessage}
                        emptyTitle="Mulai percakapan"
                        emptyHint="Peer supporter kamu siap mendengarkan."
                        composerPlaceholder="Tulis pesan untuk peer supporter…"
                        showCrisisBanner={crisisFlagged}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">
                      Belum terhubung dengan peer supporter. Minta dukungan untuk chat 1-on-1
                      dengan mahasiswa terlatih yang didampingi konselor.
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestSupport}
                      disabled={requesting}
                      className="mt-4 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#00153a] transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {requesting ? 'Mencarikan peer supporter…' : 'Minta dukungan'}
                    </button>
                  </div>
                )}

                {/* Circles */}
                <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FiUsers className="text-[#FFCA40]" /> Peer circles
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grup kecil dimoderasi peer supporter.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {circles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada circle aktif.</p>
                  ) : (
                    circles.map((circle) => (
                      <div
                        key={circle.id}
                        className="rounded-xl border border-border bg-card p-4 transition hover:border-[#FFCA40]/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{circle.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {circle.member_count} anggota
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleJoinCircle(circle)}
                            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              circle.is_member
                                ? 'border-border text-muted-foreground hover:text-foreground'
                                : 'border-[#FFCA40]/40 bg-[#FFCA40]/10 text-[#FFCA40]'
                            }`}
                          >
                            {circle.is_member ? 'Keluar' : 'Gabung'}
                          </button>
                        </div>
                        {circle.description && (
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {circle.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* ===== Counselor tab ===== */}
            {tab === 'counselor' && (
              <section className="mt-5">
                {counselorThreadId !== null ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">Konselor</p>
                      <button
                        type="button"
                        onClick={async () => {
                          await closeCounselingThread(counselorThreadId);
                          setCounselorThreadId(null);
                          setCounselorMessages([]);
                          toast('Thread ditutup');
                        }}
                        className="text-xs text-muted-foreground underline transition hover:text-foreground"
                      >
                        Tutup thread
                      </button>
                    </div>
                    <div className="h-[460px]">
                      <ChatThread
                        messages={counselorChatMessages}
                        currentUserId={currentUserId}
                        onSend={sendToCounselor}
                        emptyTitle="Mulai percakapan dengan konselor"
                        emptyHint="Tulis apa yang sedang kamu alami — konselor akan membalas di sini."
                        composerPlaceholder="Tulis pesan untuk konselor…"
                        showCrisisBanner={crisisFlagged}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Konselor juga bisa mengirim email kepadamu; balasan lewat email tetap
                      masuk ke thread ini dan ditandai sebagai pesan email.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-sm text-muted-foreground">
                      Chat langsung dengan konselor profesional. Jika kamu punya kasus aktif,
                      pesanmu otomatis diarahkan ke konselor penanggung jawab.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartCounselorChat}
                      disabled={sending}
                      className="mt-4 rounded-full bg-[#FFCA40] px-6 py-3 text-sm font-semibold text-[#00153a] transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? 'Menyiapkan…' : 'Mulai chat dengan konselor'}
                    </button>
                  </div>
                )}
              </section>
            )}

            <p className="mt-8 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
              Keadaan darurat: SEJIWA 119 tekan 8 (gratis, 24 jam) atau Crisis Centre UGM
              0851-0111-0800. Semua pesan disaring otomatis untuk bahasa krisis dan percakapan
              peer support diawasi konselor.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
