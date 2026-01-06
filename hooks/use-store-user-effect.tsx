"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef } from "react";

export function useStoreUserEffect() {
  const { user } = useUser();
  const storeUser = useMutation(api.users.storeUser);
  const hasStored = useRef(false);

  useEffect(() => {
    if (!user || hasStored.current) return;

    const syncUser = async () => {
      try {
        await storeUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        });
        hasStored.current = true; // Mark as stored
      } catch (error) {
        console.error("Error storing user:", error);
      }
    };

    syncUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user ID, not the mutation
}
