/**
 * PHASE 60: Optimistic Mutation Hook
 * Provides instant UI feedback while mutation runs in background
 */

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface OptimisticMutationOptions<T> {
  onOptimisticUpdate?: () => void;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOptimisticMutation<Result = any>(
  mutation: any,
  options: OptimisticMutationOptions<Result> = {}
) {
  const mutate = useMutation(mutation);
  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any) => {
      setIsPending(true);
      
      // Optimistic update - run immediately
      options.onOptimisticUpdate?.();

      try {
        const result = await mutate(args);
        
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        
        options.onSuccess?.(result as Result);
        return result as Result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        
        if (options.errorMessage) {
          toast.error(options.errorMessage);
        } else {
          toast.error(err.message);
        }
        
        options.onError?.(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [mutate, options]
  );

  return { execute, isPending };
}

/**
 * Simple optimistic action wrapper
 * Use for quick actions like "Add Friend", "Join Queue", etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOptimisticAction<Result = any>(
  mutation: any,
  successMessage?: string
) {
  return useOptimisticMutation<Result>(mutation, { successMessage });
}
