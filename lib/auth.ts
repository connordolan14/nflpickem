"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export interface UserProfile extends User {
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserWithProfile = async (sessionUser: User | null) => {
      if (!sessionUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", sessionUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setUser(sessionUser); // Set user without role
      } else {
        setUser({ ...sessionUser, role: profile?.role });
      }
      setLoading(false);
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserWithProfile(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user ?? null;
      fetchUserWithProfile(sessionUser);

      // Create profile for new users
      if (event === "SIGNED_IN" && sessionUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", sessionUser.id)
          .single();

        if (!profile) {
          await supabase.from("profiles").insert({
            user_id: sessionUser.id,
            display_name: sessionUser.email?.split("@")[0] || "User",
            role: "user", // Default role
          });
          // Re-fetch after creation to get the role
          fetchUserWithProfile(sessionUser);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    signOut,
  }
}
