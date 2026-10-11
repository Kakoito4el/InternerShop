import { create } from "zustand";
import { apiClient } from "../api/client";
import { useToastStore } from "./useToastStore";
import type { CartItem, Product } from "../types";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  resetSession: () => void;
  setOpen: (isOpen: boolean) => void;
  addToCart: (
    product: Product,
    quantity?: number,
    options?: Record<string, any>,
  ) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
}

interface CartResponse {
  items?: unknown;
}

interface PendingAdd {
  product: Product;
  options?: Record<string, any>;
  timer: number;
  version: number;
}

const DEBOUNCE_MS = 400;
const pendingAdds = new Map<number, PendingAdd>();
const itemVersions = new Map<number, number>();
const updateTimers = new Map<number, number>();
const removeTimers = new Map<number, number>();
let nextTemporaryId = -1;
let cartGeneration = 0;

const sameOptions = (
  first?: Record<string, any>,
  second?: Record<string, any>,
) => JSON.stringify(first ?? {}) === JSON.stringify(second ?? {});

const nextVersion = (id: number) => {
  const version = (itemVersions.get(id) ?? 0) + 1;
  itemVersions.set(id, version);
  return version;
};

const toastError = (message: string) =>
  useToastStore.getState().showToast(message, "error");

const cancelItemTimers = (itemId: number) => {
  const pendingAdd = pendingAdds.get(itemId);
  if (pendingAdd) {
    window.clearTimeout(pendingAdd.timer);
    pendingAdds.delete(itemId);
  }

  const updateTimer = updateTimers.get(itemId);
  if (updateTimer !== undefined) {
    window.clearTimeout(updateTimer);
    updateTimers.delete(itemId);
  }

  const removeTimer = removeTimers.get(itemId);
  if (removeTimer !== undefined) {
    window.clearTimeout(removeTimer);
    removeTimers.delete(itemId);
  }
};

const scheduleQuantitySync = (
  itemId: number,
  quantity: number,
  generation: number,
  previousQuantity: number,
) => {
  cancelItemTimers(itemId);
  const version = nextVersion(itemId);

  if (itemId < 0) {
    const item = useCartStore
      .getState()
      .items.find((cartItem) => cartItem.id === itemId);
    const product = item?.product;
    if (!product) {
      return;
    }

    const timer = window.setTimeout(async () => {
      pendingAdds.delete(itemId);

      try {
        const response = await apiClient.post<CartItem>("/api/v1/cart/items", {
          product_id: product.id,
          quantity,
          selected_options: item.selected_options,
        });

        if (
          generation !== cartGeneration ||
          itemVersions.get(itemId) !== version
        ) {
          return;
        }

        useCartStore.setState((state) => ({
          items: state.items.map((cartItem) =>
            cartItem.id === itemId ? response.data : cartItem,
          ),
        }));
        itemVersions.delete(itemId);
      } catch {
        if (
          generation === cartGeneration &&
          itemVersions.get(itemId) === version
        ) {
          useCartStore.setState((state) => ({
            items: state.items.filter((cartItem) => cartItem.id !== itemId),
          }));
          itemVersions.delete(itemId);
        }
        toastError("Не удалось синхронизировать товар с корзиной.");
      }
    }, DEBOUNCE_MS);

    pendingAdds.set(itemId, {
      product,
      options: item.selected_options,
      timer,
      version,
    });
    return;
  }

  const timer = window.setTimeout(async () => {
    updateTimers.delete(itemId);

    try {
      const response = await apiClient.patch<CartItem>(
        `/api/v1/cart/items/${itemId}`,
        { quantity },
      );

      if (
        generation !== cartGeneration ||
        itemVersions.get(itemId) !== version
      ) {
        return;
      }

      useCartStore.setState((state) => ({
        items: state.items.map((item) =>
          item.id === itemId ? response.data : item,
        ),
      }));
    } catch {
      if (
        generation === cartGeneration &&
        itemVersions.get(itemId) === version
      ) {
        useCartStore.setState((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, quantity: previousQuantity }
              : item,
          ),
        }));
        itemVersions.delete(itemId);
      }
      toastError("Не удалось обновить количество товара в корзине.");
    }
  }, DEBOUNCE_MS);

  updateTimers.set(itemId, timer);
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("token") ??
          window.localStorage.getItem("access_token")
        : null;
    if (!token) {
      set({ items: [], isLoading: false, error: null });
      return;
    }

    const generation = cartGeneration;

    try {
      const response = await apiClient.get<CartItem[] | CartResponse>(
        "/api/v1/cart/",
      );
      if (generation !== cartGeneration) {
        return;
      }

      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
          ? response.data.items
          : [];
      set({ items, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: "Не удалось загрузить корзину." });
      toastError("Не удалось загрузить корзину.");
      throw error;
    }
  },

  setOpen: (isOpen) => set({ isOpen }),

  resetSession: () => {
    cartGeneration += 1;
    for (const pendingAdd of pendingAdds.values()) {
      window.clearTimeout(pendingAdd.timer);
    }
    for (const timer of updateTimers.values()) {
      window.clearTimeout(timer);
    }
    for (const timer of removeTimers.values()) {
      window.clearTimeout(timer);
    }
    pendingAdds.clear();
    updateTimers.clear();
    removeTimers.clear();
    itemVersions.clear();
    set({ items: [], isOpen: false, isLoading: false, error: null });
  },

  addToCart: (product, quantity = 1, options) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      toastError("Количество товара должно быть не меньше одного.");
      return Promise.resolve();
    }
    if (!product.is_available || product.stock < quantity) {
      toastError("Недостаточно товара в наличии.");
      return Promise.resolve();
    }

    const generation = cartGeneration;
    const existingItem = get().items.find(
      (item) =>
        item.product_id === product.id &&
        sameOptions(item.selected_options, options),
    );
    const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
    if (nextQuantity > product.stock) {
      toastError("Недостаточно товара в наличии.");
      return Promise.resolve();
    }

    if (existingItem) {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: nextQuantity, product }
            : item,
        ),
      }));
      scheduleQuantitySync(
        existingItem.id,
        nextQuantity,
        generation,
        existingItem.quantity,
      );
      return Promise.resolve();
    }

    const temporaryId = nextTemporaryId--;
    const item: CartItem = {
      id: temporaryId,
      product_id: product.id,
      quantity,
      selected_options: options,
      product,
    };
    set((state) => ({ items: [...state.items, item] }));
    scheduleQuantitySync(temporaryId, quantity, generation, 0);
    return Promise.resolve();
  },

  removeFromCart: (cartItemId) => {
    const previousItems = get().items;
    const removedItem = previousItems.find((item) => item.id === cartItemId);
    if (!removedItem) {
      return Promise.resolve();
    }

    const generation = cartGeneration;
    cancelItemTimers(cartItemId);
    const version = nextVersion(cartItemId);
    set((state) => ({
      items: state.items.filter((item) => item.id !== cartItemId),
    }));

    if (cartItemId < 0) {
      return Promise.resolve();
    }

    const timer = window.setTimeout(() => {
      removeTimers.delete(cartItemId);
      void apiClient.delete(`/api/v1/cart/items/${cartItemId}`).catch(() => {
        if (
          generation === cartGeneration &&
          itemVersions.get(cartItemId) === version
        ) {
          set((state) => ({
            items: state.items.some((item) => item.id === cartItemId)
              ? state.items
              : [...state.items, removedItem],
          }));
        }
        toastError("Не удалось удалить товар из корзины.");
      });
    }, DEBOUNCE_MS);
    removeTimers.set(cartItemId, timer);

    return Promise.resolve();
  },

  updateQuantity: (cartItemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      toastError("Количество товара должно быть не меньше одного.");
      return Promise.resolve();
    }

    const item = get().items.find((cartItem) => cartItem.id === cartItemId);
    if (!item) {
      return Promise.resolve();
    }
    if (item.product && quantity > item.product.stock) {
      toastError("Недостаточно товара в наличии.");
      return Promise.resolve();
    }

    const generation = cartGeneration;
    const previousQuantity = item.quantity;
    set((state) => ({
      items: state.items.map((cartItem) =>
        cartItem.id === cartItemId ? { ...cartItem, quantity } : cartItem,
      ),
    }));
    scheduleQuantitySync(cartItemId, quantity, generation, previousQuantity);
    return Promise.resolve();
  },

  clearCart: () => {
    const previousItems = get().items;
    if (previousItems.length === 0) {
      return Promise.resolve();
    }

    cartGeneration += 1;
    const generation = cartGeneration;
    for (const item of previousItems) {
      cancelItemTimers(item.id);
      nextVersion(item.id);
    }
    set({ items: [] });

    void apiClient.delete("/api/v1/cart/").catch(() => {
      if (generation === cartGeneration && get().items.length === 0) {
        set({ items: previousItems });
      }
      toastError("Не удалось очистить корзину.");
    });

    return Promise.resolve();
  },

  getTotalPrice: () =>
    (Array.isArray(get().items) ? get().items : []).reduce(
      (total, item) => total + (item.product?.price ?? 0) * item.quantity,
      0,
    ),
}));
