"use client";

import { format } from 'date-fns';

export default function AdminFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-4 text-center md:text-left">
      <p className="text-[11px] tracking-wide text-white/30">
        &copy; {format(new Date(), 'yyyy')} UGM-AICare Admin Panel. All rights reserved.
      </p>
    </footer>
  );
}
