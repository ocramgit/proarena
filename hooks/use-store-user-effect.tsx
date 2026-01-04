"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";

export function useStoreUserEffect() {
  const { user } = useUser();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      try {
        await storeUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        });
      } catch (error) {
        console.error("Error storing user:", error);
      }
    };

    syncUser();
  }, [user, storeUser]);
}
