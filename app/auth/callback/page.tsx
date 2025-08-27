"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const redirectByRole = async (userId: string) => {
      // Fetch the role and redirect accordingly
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (!isMounted) return;
      router.replace(profile?.role === "admin" ? "/admin" : "/dashboard");
    };

    const init = async () => {
      // First, try to get an existing session (supabase parses the URL hash on load)
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session ?? null;

      if (session?.user?.id) {
        await redirectByRole(session.user.id);
        return;
      }

      // If no session yet (hash still handling), listen for SIGNED_IN
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) return;
          if (event === "SIGNED_IN" && session?.user?.id) {
            await redirectByRole(session.user.id);
          }
        }
      );

      // In case of explicit error or no session after a short delay, fall back to auth
      // but prefer to rely on the listener which should fire almost immediately.
      return () => {
        listener.subscription.unsubscribe();
        isMounted = false;
      };
    };

    const cleanup = init();
    return () => {
      isMounted = false;
      // If init returned a cleanup function, call it
      if (typeof (cleanup as any) === "function") {
        (cleanup as any)();
      }
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Finalizing login...</p>
      </div>
    </div>
  );
}
