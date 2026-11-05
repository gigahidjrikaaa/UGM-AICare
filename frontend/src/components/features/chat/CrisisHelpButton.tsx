"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiPhone, FiChevronUp, FiX } from "react-icons/fi";

/**
 * Crisis numbers mirror backend/app/core/crisis_resources.py (single source
 * of truth on the backend); keep both in sync when a number changes.
 */
const CRISIS_RESOURCES = [
  {
    title: "SEJIWA 119 tekan 8",
    description: "Hotline kesehatan jiwa Kemenkes RI. Gratis, 24 jam.",
    phone: "119 ext. 8",
    tel: "119",
  },
  {
    title: "112 Pusat Panggilan Darurat",
    description: "Nomor darurat nasional (polisi, ambulans, pemadam). Gratis, 24 jam.",
    phone: "112",
    tel: "112",
  },
  {
    title: "Crisis Centre UGM",
    description: "Layanan krisis kampus untuk mahasiswa UGM.",
    phone: "0851-0111-0800",
    tel: "+6285101110800",
  },
  {
    title: "119 Gawat Darurat Medis",
    description: "Ambulans dan bantuan medis nasional. Gratis, 24 jam.",
    phone: "119",
    tel: "119",
  },
];

/**
 * Persistent in-chat emergency affordance. Crisis support must never depend
 * on the AI pipeline having parsed the message correctly — this button is
 * always visible near the composer and opens the canonical hotline list.
 */
export function CrisisHelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
      >
        <FiAlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Bantuan Darurat
        <FiChevronUp
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Nomor darurat"
          className="absolute bottom-full left-0 z-40 mb-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#001D58]/95 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Butuh bantuan sekarang?</p>
              <p className="mt-0.5 text-xs text-white/60">
                Kalau kamu atau orang di sekitarmu dalam bahaya, hubungi salah satu nomor ini.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup"
              className="rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-2">
            {CRISIS_RESOURCES.map((resource) => (
              <li key={resource.title}>
                <a
                  href={`tel:${resource.tel}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/25 hover:bg-white/10"
                >
                  <FiPhone className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCA40]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">
                      {resource.title} · {resource.phone}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/60">{resource.description}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <Link
            href="/resources"
            className="mt-3 block rounded-xl border border-[#FFCA40]/30 bg-[#FFCA40]/10 px-3 py-2 text-center text-xs font-semibold text-[#FFCA40] transition hover:bg-[#FFCA40]/20"
            onClick={() => setIsOpen(false)}
          >
            Lihat semua layanan dukungan
          </Link>
        </div>
      )}
    </div>
  );
}
