import type { Theme } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  // UI State
  theme: Theme;

  // Actions
  setTheme: (theme: Theme) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      theme: "system",

      // Actions
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "app-store", // localStorage key
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
