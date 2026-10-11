import { create } from "zustand";
import { apiClient } from "../api/client";
import { useAppStore } from "./useAppStore";
import { useAuthStore } from "./useAuthStore";
import { useCartStore } from "./useCartStore";
import { useToastStore } from "./useToastStore";
import type { Order, OrderItem, OrderStatus } from "../types";

interface CheckoutDetails {
  customer_name: string;
  phone: string;
  delivery_address: string;
}

interface OrderStore {
  orders: Order[];
  resetSession: () => void;
  fetchOrders: () => Promise<void>;
  fetchAdminOrders: () => Promise<void>;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  checkout: (details: CheckoutDetails) => void;
  payOrder: (orderId: number) => void;
}

let nextOptimisticOrderId = -1;
let checkoutInFlight = false;
const paymentInFlight = new Set<number>();
const pendingOrderIds = new Set<number>();
const orderVersions = new Map<number, number>();
const orderStatusTimers = new Map<number, number>();
const pendingStatusSnapshots = new Map<number, Order>();
let sessionGeneration = 0;

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    error.isAxiosError === true &&
    "response" in error
  ) {
    const response = error.response;
    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response
    ) {
      const data = response.data;
      if (
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof data.detail === "string"
      ) {
        return data.detail;
      }
    }
  }

  return "Не удалось выполнить оплату. Изменения отменены.";
};

const restoreBalance = (balance: number, optimisticBalance: number) => {
  const user = useAuthStore.getState().user;
  if (user && user.balance === optimisticBalance) {
    useAuthStore.setState({ user: { ...user, balance } });
  }
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],

  resetSession: () => {
    sessionGeneration += 1;
    for (const timer of orderStatusTimers.values()) {
      window.clearTimeout(timer);
    }
    orderStatusTimers.clear();
    pendingStatusSnapshots.clear();
    orderVersions.clear();
    pendingOrderIds.clear();
    paymentInFlight.clear();
    checkoutInFlight = false;
    set({ orders: [] });
  },

  fetchOrders: async () => {
    const generation = sessionGeneration;
    try {
      const response = await apiClient.get<Order[]>("/api/v1/orders/");
      if (generation !== sessionGeneration) {
        return;
      }
      const receivedOrders = Array.isArray(response.data) ? response.data : [];
      set((state) => {
        const pendingOrders = state.orders.filter(
          (order) => order.id < 0 || pendingOrderIds.has(order.id),
        );
        const mergedOrders = new Map(
          receivedOrders.map((order) => [order.id, order]),
        );
        for (const order of pendingOrders) {
          mergedOrders.set(order.id, order);
        }
        return {
          orders: [...mergedOrders.values()].sort(
            (first, second) =>
              new Date(second.created_at).getTime() -
              new Date(first.created_at).getTime(),
          ),
        };
      });
    } catch {
      useToastStore
        .getState()
        .showToast("Не удалось загрузить историю заказов.", "error");
    }
  },

  fetchAdminOrders: async () => {
    const generation = sessionGeneration;
    try {
      const response = await apiClient.get<Order[]>("/api/v1/orders/admin/all");
      if (generation !== sessionGeneration) {
        return;
      }
      if (!Array.isArray(response.data)) {
        throw new Error("Сервер вернул неожиданный список заказов.");
      }
      set((state) => {
        const optimisticOrders = state.orders.filter(
          (order) => order.id < 0 || pendingOrderIds.has(order.id),
        );
        const ordersById = new Map(
          response.data.map((order) => [order.id, order]),
        );
        for (const order of optimisticOrders) {
          ordersById.set(order.id, order);
        }
        return {
          orders: [...ordersById.values()].sort(
            (first, second) =>
              new Date(second.created_at).getTime() -
              new Date(first.created_at).getTime(),
          ),
        };
      });
    } catch (error) {
      useToastStore
        .getState()
        .showToast("Не удалось загрузить заказы клиентов.", "error");
      throw error;
    }
  },

  updateOrderStatus: (orderId, status) => {
    const previousOrder = get().orders.find((order) => order.id === orderId);
    if (!previousOrder || previousOrder.status === status || orderId < 0) {
      return;
    }

    if (!pendingStatusSnapshots.has(orderId)) {
      pendingStatusSnapshots.set(orderId, previousOrder);
    }
    const version = (orderVersions.get(orderId) ?? 0) + 1;
    orderVersions.set(orderId, version);
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    }));

    const currentTimer = orderStatusTimers.get(orderId);
    if (currentTimer !== undefined) {
      window.clearTimeout(currentTimer);
    }
    const timer = window.setTimeout(async () => {
      orderStatusTimers.delete(orderId);
      const rollbackOrder = pendingStatusSnapshots.get(orderId);
      const generation = sessionGeneration;

      try {
        const response = await apiClient.patch<Order>(
          `/api/v1/orders/${orderId}/status`,
          { status },
        );
        if (
          generation === sessionGeneration &&
          orderVersions.get(orderId) === version
        ) {
          orderVersions.delete(orderId);
          pendingStatusSnapshots.delete(orderId);
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === orderId ? response.data : order,
            ),
          }));
          useToastStore
            .getState()
            .showToast(`Статус заказа #${orderId} обновлён.`, "success");
        }
      } catch (error) {
        if (
          generation === sessionGeneration &&
          orderVersions.get(orderId) === version
        ) {
          orderVersions.delete(orderId);
          pendingStatusSnapshots.delete(orderId);
          if (rollbackOrder) {
            set((state) => ({
              orders: state.orders.map((order) =>
                order.id === orderId ? rollbackOrder : order,
              ),
            }));
          }
        }
        useToastStore
          .getState()
          .showToast("Не удалось изменить статус заказа. Изменения отменены.", "error");
      }
    }, 400);
    orderStatusTimers.set(orderId, timer);
  },

  checkout: (details) => {
    const generation = sessionGeneration;
    const { items, getTotalPrice, clearCart, setOpen } =
      useCartStore.getState();
    const { user, fetchMe } = useAuthStore.getState();
    const settings = useAppStore.getState().settings;
    const safeItems = Array.isArray(items) ? items : [];
    const totalAmount = getTotalPrice() + settings.delivery_fee;

    if (checkoutInFlight) {
      return;
    }
    if (!user || safeItems.length === 0) {
      useToastStore
        .getState()
        .showToast("Войдите в аккаунт и добавьте товары в корзину.", "error");
      return;
    }
    if (user.balance < totalAmount) {
      useToastStore
        .getState()
        .showToast("Недостаточно средств на виртуальном балансе.", "error");
      return;
    }

    const optimisticId = nextOptimisticOrderId--;
    const now = new Date().toISOString();
    const orderItems: OrderItem[] = safeItems.map((item, index) => ({
      id: -(index + 1),
      product_id: item.product_id,
      title_snapshot: item.product?.title ?? `Товар #${item.product_id}`,
      price_snapshot: item.product?.price ?? 0,
      quantity: item.quantity,
      selected_options: item.selected_options,
    }));
    const optimisticOrder: Order = {
      id: optimisticId,
      app_id: import.meta.env.VITE_APP_ID || "cyber-tech",
      user_id: user.id,
      total_amount: totalAmount,
      status: "PAID",
      customer_name: details.customer_name,
      phone: details.phone,
      delivery_address: details.delivery_address,
      created_at: now,
      items: orderItems,
    };
    const optimisticBalance = user.balance - totalAmount;

    checkoutInFlight = true;
    pendingOrderIds.add(optimisticId);
    set((state) => ({ orders: [optimisticOrder, ...state.orders] }));
    useAuthStore.setState({
      user: { ...user, balance: optimisticBalance },
    });
    setOpen(false);

    void (async () => {
      let createdOrder: Order | null = null;

      try {
        const createResponse = await apiClient.post<Order>("/api/v1/orders/", {
          customer_name: details.customer_name,
          phone: details.phone,
          delivery_address: details.delivery_address,
        });
        if (generation !== sessionGeneration) {
          return;
        }
        createdOrder = createResponse.data;
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === optimisticId ? createdOrder! : order,
          ),
        }));
        pendingOrderIds.add(createdOrder.id);
        pendingOrderIds.delete(optimisticId);

        const paymentResponse = await apiClient.post<Order>(
          `/api/v1/orders/${createdOrder.id}/pay`,
        );
        if (generation !== sessionGeneration) {
          return;
        }
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === createdOrder!.id ? paymentResponse.data : order,
          ),
        }));
        pendingOrderIds.delete(createdOrder.id);
        void clearCart();
        checkoutInFlight = false;
        useToastStore
          .getState()
          .showToast("Заказ оплачен! Спасибо за покупку.", "success");
        void fetchMe().catch((error: unknown) => {
          console.error("Не удалось синхронизировать профиль после оплаты.", error);
        });
      } catch (error) {
        if (generation !== sessionGeneration) {
          return;
        }
        if (createdOrder) {
          set((state) => ({
            orders: state.orders.map((order) =>
              order.id === optimisticId
                ? { ...createdOrder!, status: "NEW" as OrderStatus }
                : order,
            ),
          }));
          pendingOrderIds.delete(optimisticId);
          pendingOrderIds.delete(createdOrder.id);
        } else {
          set((state) => ({
            orders: state.orders.filter((order) => order.id !== optimisticId),
          }));
          pendingOrderIds.delete(optimisticId);
        }
        restoreBalance(user.balance, optimisticBalance);
        checkoutInFlight = false;
        useToastStore.getState().showToast(getErrorMessage(error), "error");
      }
    })();
  },

  payOrder: (orderId) => {
    if (paymentInFlight.has(orderId)) {
      return;
    }

    const order = get().orders.find((item) => item.id === orderId);
    const user = useAuthStore.getState().user;
    if (!order || order.status !== "NEW" || !user) {
      return;
    }
    if (user.balance < order.total_amount) {
      useToastStore
        .getState()
        .showToast("Недостаточно средств на виртуальном балансе.", "error");
      return;
    }

    paymentInFlight.add(orderId);
    const generation = sessionGeneration;
    const version = (orderVersions.get(orderId) ?? 0) + 1;
    orderVersions.set(orderId, version);
    const optimisticBalance = user.balance - order.total_amount;
    set((state) => ({
      orders: state.orders.map((item) =>
        item.id === orderId ? { ...item, status: "PAID" } : item,
      ),
    }));
    useAuthStore.setState({
      user: { ...user, balance: optimisticBalance },
    });

    void apiClient
      .post<Order>(`/api/v1/orders/${orderId}/pay`)
      .then((response) => {
        if (generation !== sessionGeneration) {
          return;
        }
        if (orderVersions.get(orderId) === version) {
          set((state) => ({
            orders: state.orders.map((item) =>
              item.id === orderId ? response.data : item,
            ),
          }));
          useToastStore
            .getState()
            .showToast(`Заказ #${orderId} оплачен.`, "success");
          void useAuthStore.getState().fetchMe().catch((error: unknown) => {
            console.error("Не удалось синхронизировать баланс после оплаты.", error);
          });
        }
      })
      .catch((error: unknown) => {
        if (generation !== sessionGeneration) {
          return;
        }
        if (orderVersions.get(orderId) === version) {
          set((state) => ({
            orders: state.orders.map((item) =>
              item.id === orderId ? order : item,
            ),
          }));
          restoreBalance(user.balance, optimisticBalance);
        }
        useToastStore.getState().showToast(getErrorMessage(error), "error");
      })
      .finally(() => {
        paymentInFlight.delete(orderId);
        if (orderVersions.get(orderId) === version) {
          orderVersions.delete(orderId);
        }
      });
  },
}));
