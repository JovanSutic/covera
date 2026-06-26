/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { toast } from "sonner";

type TaskOptions = {
  successMessage?: string;
  showToast?: boolean;
};

export function useSupabaseTask() {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async <TResponse extends { data?: any; error: any }>(
    task: () => Promise<TResponse>,
    options: TaskOptions = {}
  ): Promise<TResponse["data"] | null> => {
    const { successMessage, showToast = true } = options;
    
    setIsLoading(true);
    
    try {
      const response = await task();
      const { data, error } = response;

      if (error) {
        if (showToast) {
          toast.error(error.message || "An auth error occurred.");
        }
        return null;
      }

      if (showToast && successMessage) {
        toast.success(successMessage);
      }

      return data;
    } catch (err: any) {
      if (showToast) {
        toast.error(err.message);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}
