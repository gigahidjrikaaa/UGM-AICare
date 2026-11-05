"use client";

import { useEffect, useState } from "react";

import { sanitizeRenderableImageUrl } from "@/lib/imageUrl";

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  /** Classes for the initials fallback text, e.g. "text-sm font-semibold". */
  initialsClassName?: string;
};

const INITIALS_BASE =
  "absolute inset-0 flex items-center justify-center bg-[#FFCA40]/10 font-semibold text-[#FFCA40] select-none";

/**
 * Resilient avatar for remote URLs that may be missing, malformed, or served
 * from hosts outside the next/image allowlist (Gravatar, DiceBear, counselor
 * photos, user-uploaded URLs). Must be placed inside a sized `relative
 * overflow-hidden` wrapper: it renders the initials underneath and the image
 * on top, so a failed load simply reveals the initials instead of a broken
 * image icon.
 */
export default function UserAvatar({
  src,
  name,
  email,
  initialsClassName = "text-sm",
}: UserAvatarProps) {
  const safeSrc = sanitizeRenderableImageUrl(src, "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [safeSrc]);

  const initial = (name || email || "U").trim().charAt(0).toUpperCase() || "U";
  const showImage = Boolean(safeSrc) && !failed;

  return (
    <span className="pointer-events-none absolute inset-0 block">
      <span className={`${INITIALS_BASE} ${initialsClassName}`}>{initial}</span>
      {showImage && safeSrc && (
        // Plain <img> on purpose: avatar hosts are not restricted to the
        // next/image remotePatterns allowlist, and optimization is irrelevant
        // at thumbnail sizes.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeSrc}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
