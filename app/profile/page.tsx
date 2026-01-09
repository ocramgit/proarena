"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * FASE 29: PROFILE REDIRECT
 * Redirects /profile to user profile page
 */

export default function ProfileRedirect() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (currentUser) {
      // Use nickname if available, otherwise use full clerkId
      const identifier = currentUser.nickname || currentUser.clerkId
      
      router.push(`/profile/${identifier}`)
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
    </div>
  );
}
