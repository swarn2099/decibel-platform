import { create } from "zustand";
import { mmkv } from "@/lib/storage";

interface UIState {
  hasSeenOnboarding: boolean;
  isOnline: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  setIsOnline: (online: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  hasSeenOnboarding: mmkv.getBoolean("hasSeenOnboarding") ?? false,
  isOnline: true,
  setHasSeenOnboarding: (seen) => {
    mmkv.set("hasSeenOnboarding", seen);
    set({ hasSeenOnboarding: seen });
  },
  setIsOnline: (online) => set({ isOnline: online }),
}));
