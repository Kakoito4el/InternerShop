import { create } from "zustand";
import { apiClient } from "../api/client";
import { useToastStore } from "./useToastStore";
import type { AppSettings } from "../types";

interface AppStore {
  settings: AppSettings;
  isLoadingSettings: boolean;
  settingsError: string | null;
  fetchSettings: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set) => ({
  settings: {
    store_name: "CyberTech",
    currency: "USD",
    delivery_fee: 0,
    min_order_amount: 0,
  },
  isLoadingSettings: false,
  settingsError: null,

  fetchSettings: async () => {
    set({ settingsError: null });

    try {
      const response = await apiClient.get<AppSettings>(
        "/api/v1/apps/settings",
      );
      set((state) => ({
        settings: { ...state.settings, ...response.data },
        isLoadingSettings: false,
      }));
    } catch (error) {
      set({
        isLoadingSettings: false,
        settingsError: "Не удалось загрузить настройки магазина.",
      });
      useToastStore
        .getState()
        .showToast("Не удалось загрузить настройки магазина.", "error");
      throw error;
    }
  },
}));
