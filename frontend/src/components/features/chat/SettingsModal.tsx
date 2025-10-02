'use client';

import { useEffect, useState } from "react";

import { Button } from '@/components/ui/Button';
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiVolume2, FiMic, FiRefreshCcw } from "react-icons/fi";
import { useLiveTalkStore } from "@/store/useLiveTalkStore";
import { toast } from "react-hot-toast";
import DeviceSelector from "./DeviceSelector";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [mounted, setMounted] = useState(false);
  const {
    messageSoundsEnabled,
    setMessageSoundsEnabled,
    ttsEnabled,
    setTtsEnabled,
  } = useLiveTalkStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const testMicrophone = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Tidak dapat mengakses mikrofon. Pastikan izin sudah diberikan.");
      return false;
    }
  };

  const testSpeaker = async (): Promise<boolean> => {
    try {
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.connect(gain).connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
      window.setTimeout(() => {
        void audioCtx.close();
      }, 1000);
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Tidak dapat memutar suara uji. Periksa perangkat output Anda.");
      return false;
    }
  };

  const handleTestDevices = async () => {
    const micReady = await testMicrophone();
    if (!micReady) {
      return;
    }
    const speakerReady = await testSpeaker();
    if (!speakerReady) {
      return;
    }
    toast.success("Perangkat input dan output siap digunakan.");
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="audio-settings"
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan audio"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-[#0b152e]/90 shadow-[0_30px_70px_rgba(5,9,30,0.55)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex flex-col gap-6 p-6 md:gap-8 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Pengaturan Audio</h2>
                  <p className="text-sm text-white/60">
                    Kelola preferensi suara, tes perangkat, dan pilih input/output yang ingin digunakan.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="self-start rounded-full p-1 text-gray-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ugm-gold/60"
                  aria-label="Tutup pengaturan"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="group flex items-start gap-3 rounded-2xl border border-white/12 bg-white/8 p-4 transition hover:border-ugm-gold/40">
                      <input
                        type="checkbox"
                        className="mt-1.5 h-4 w-4 flex-none accent-ugm-gold"
                        checked={messageSoundsEnabled}
                        onChange={(event) => setMessageSoundsEnabled(event.target.checked)}
                      />
                      <span className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-white">
                          <FiVolume2 /> Suara gelembung pesan
                        </span>
                        <span className="text-xs text-white/55">
                          Nonaktifkan untuk menonaktifkan bunyi ketika pesan baru muncul di percakapan.
                        </span>
                      </span>
                    </label>

                    <label className="group flex items-start gap-3 rounded-2xl border border-white/12 bg-white/8 p-4 transition hover:border-ugm-gold/40">
                      <input
                        type="checkbox"
                        className="mt-1.5 h-4 w-4 flex-none accent-ugm-gold"
                        checked={ttsEnabled}
                        onChange={(event) => setTtsEnabled(event.target.checked)}
                      />
                      <span className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-white">
                          <FiMic /> Putar balasan suara (TTS)
                        </span>
                        <span className="text-xs text-white/55">
                          Nonaktifkan jika Anda tidak ingin mendengar balasan Aika secara langsung.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Tes perangkat audio</p>
                        <p className="text-xs text-white/55">
                          Jalankan uji cepat untuk memastikan mikrofon dan speaker aktif.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestDevices}
                        className="flex w-full items-center justify-center gap-2 border-white/20 bg-white/10 text-white transition hover:bg-white/15 sm:w-auto"
                      >
                        <FiRefreshCcw className="h-4 w-4" />
                        <span>Uji Input & Output</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/12 bg-white/6 p-4 shadow-[0_20px_45px_rgba(8,12,38,0.35)]">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white">Pemilihan perangkat</p>
                    <p className="text-xs text-white/55">Atur input/output dan suara yang digunakan Live Talk.</p>
                  </div>
                  <DeviceSelector />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SettingsModal;
