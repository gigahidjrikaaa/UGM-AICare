"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { setAccessToken } from "@/services/api";

/**
 * This component is responsible for synchronizing the NextAuth session token
 * with the API client's local state. This avoids calling getSession() on every
 * API request, which would trigger unnecessary network calls.
 */
export default function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Update the access token in the API client whenever the session changes
    setAccessToken(session?.accessToken);
  }, [session?.accessToken]);

  useEffect(() => {
    // Privacy: drop the persisted Aika thread id when signed out, so the next
    // user on a shared machine cannot adopt the previous user's conversation.
    if (status === "unauthenticated") {
      try {
        window.localStorage.removeItem("aika-session-id");
      } catch {
        // storage unavailable (private mode) — nothing to clean
      }
    }
  }, [status]);

  return null;
}
