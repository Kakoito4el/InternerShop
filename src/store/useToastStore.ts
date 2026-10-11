import { create } from "zustand";

export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

let nextToastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, kind = "info") => {
    const id = ++nextToastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, kind }],
    }));
    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 3000);
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
