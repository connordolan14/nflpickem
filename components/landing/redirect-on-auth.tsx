"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Client-only helper to redirect authenticated users away from the landing page
 * to the dashboard. This complements middleware when auth cookies aren't
 * available server-side (e.g., when using localStorage sessions).
 */
export function RedirectOnAuth() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_IN" && session?.user) {
        router.replace("/dashboard");
      }
    });

    const go = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (active && user) {
        router.replace("/dashboard");
      }
    };

    go();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
