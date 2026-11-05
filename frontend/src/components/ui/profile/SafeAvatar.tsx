"use client";

import { useEffect, useMemo, useState } from "react";

import { sanitizeRenderableImageUrl } from "@/lib/imageUrl";

type SafeAvatarProps = {
  src: string | null | undefined;
  alt: string;
  fallbackSrc?: string;
  className?: string;
};

export default function SafeAvatar({
  src,
  alt,
  fallbackSrc = "/default-avatar.png",
  className = "h-24 w-24",
}: SafeAvatarProps) {
  const safeInitialSrc = useMemo(
    () => sanitizeRenderableImageUrl(src, fallbackSrc),
    [fallbackSrc, src],
  );
  const [resolvedSrc, setResolvedSrc] = useState(safeInitialSrc);

  useEffect(() => {
    setResolvedSrc(safeInitialSrc);
  }, [safeInitialSrc]);

  return (
    <div className={`relative overflow-hidden rounded-full border-2 border-white/30 ${className}`}>
      {/* Plain <img> on purpose: src may point at any user-supplied host, which
          next/image would reject unless allowlisted in next.config.ts. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => {
          if (resolvedSrc !== fallbackSrc) {
            setResolvedSrc(fallbackSrc);
          }
        }}
      />
    </div>
  );
}
