"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getIdleTimeoutRedirectPath,
  hasIdleSessionExpired,
} from "@/lib/session-timeout";
import { supabase } from "@/lib/supabase";

const activityStorageKey = "roatan:last-activity-at";
const timeoutNoticeKey = "roatan:signed-out-for-inactivity";
const activityEvents = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

export default function SessionIdleTimeout() {
  const pathname = usePathname();
  const router = useRouter();
  const latestPathname = useRef(pathname);
  const signingOut = useRef(false);

  useEffect(() => {
    latestPathname.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let hasSession = false;

    function markActive() {
      if (!hasSession || document.visibilityState === "hidden") return;

      window.localStorage.setItem(activityStorageKey, String(Date.now()));
    }

    async function signOutForInactivity() {
      if (signingOut.current) return;

      signingOut.current = true;
      window.localStorage.setItem(timeoutNoticeKey, "1");
      window.localStorage.removeItem(activityStorageKey);
      await supabase.auth.signOut();
      router.push(getIdleTimeoutRedirectPath(latestPathname.current));
      router.refresh();
    }

    async function checkIdle() {
      if (!hasSession || signingOut.current) return;

      const lastActivityAt = Number(
        window.localStorage.getItem(activityStorageKey) || Date.now(),
      );

      if (hasIdleSessionExpired(lastActivityAt)) {
        await signOutForInactivity();
      }
    }

    async function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;

      await checkIdle();

      if (!signingOut.current) {
        markActive();
      }
    }

    async function startSessionTimer() {
      const { data } = await supabase.auth.getSession();
      hasSession = Boolean(data.session);

      if (!hasSession) {
        window.localStorage.removeItem(activityStorageKey);
        return;
      }

      if (!window.localStorage.getItem(activityStorageKey)) {
        markActive();
      }

      await checkIdle();
    }

    startSessionTimer();
    const intervalId = window.setInterval(checkIdle, 30 * 1000);

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, markActive, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      hasSession = Boolean(session);

      if (event === "SIGNED_IN" && session) {
        signingOut.current = false;
        markActive();
      }

      if (event === "SIGNED_OUT") {
        hasSession = false;
        window.localStorage.removeItem(activityStorageKey);
      }
    });

    return () => {
      window.clearInterval(intervalId);

      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, markActive);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      listener.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
