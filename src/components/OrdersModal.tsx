import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Package, RefreshCw, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useOrderStore } from "../store/useOrderStore";
import type { OrderStatus } from "../types";

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusTheme: Record<OrderStatus, { label: string; className: string }> = {
  NEW: {
    label: "Ожидает оплаты",
    className: "border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber",
  },
  PAID: {
    label: "Оплачен",
    className: "border-cyber-emerald/30 bg-cyber-emerald/10 text-cyber-emerald",
  },
  DELIVERING: {
    label: "Доставляется",
    className: "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan",
  },
  COMPLETED: {
    label: "Завершён",
    className:
      "border-cyber-purple/30 bg-cyber-purple/10 text-cyber-purple",
  },
  CANCELLED: {
    label: "Отменён",
    className: "border-red-400/30 bg-red-400/10 text-red-300",
  },
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ru-RU")} ${currency}`;
  }
};

export function OrdersModal({ isOpen, onClose }: OrdersModalProps) {
  const currency = useAppStore((state) => state.settings.currency);
  const orders = useOrderStore((state) => state.orders);
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const payOrder = useOrderStore((state) => state.payOrder);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      void fetchOrders();
    }
  }, [fetchOrders, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="orders-modal-overlay"
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto pointer-events-auto"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.section
            aria-labelledby="orders-modal-title"
            aria-modal="true"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-[101] my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-[#1E2638] bg-[#131722] p-6 text-white shadow-2xl"
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-cyber-border px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
                  Личный кабинет
                </p>
                <h2
                  className="mt-1 text-2xl font-bold text-white"
                  id="orders-modal-title"
                >
                  Мои заказы
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Обновить список заказов"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-cyber-cyan"
                  onClick={() => void fetchOrders()}
                  type="button"
                >
                  <RefreshCw size={18} />
                </button>
                <button
                  aria-label="Закрыть заказы"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
              {orders.length === 0 ? (
                <div className="py-16 text-center">
                  <Package
                    aria-hidden="true"
                    className="mx-auto text-slate-600"
                    size={42}
                    strokeWidth={1.3}
                  />
                  <p className="mt-4 font-semibold text-slate-300">
                    Заказов пока нет
                  </p>
                </div>
              ) : (
                orders.map((order) => {
                  const theme =
                    statusTheme[order.status] ?? statusTheme.NEW;
                  return (
                    <article
                      className="rounded-xl border border-cyber-border bg-[#0b0d12]/55 p-4 sm:p-5"
                      key={order.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">
                            Заказ #{order.id}
                          </p>
                          <time
                            className="mt-1 block text-xs text-slate-500"
                            dateTime={order.created_at}
                          >
                            {new Date(order.created_at).toLocaleString("ru-RU")}
                          </time>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme.className}`}
                        >
                          {theme.label}
                        </span>
                      </div>

                      <ul className="mt-4 divide-y divide-cyber-border/70">
                        {order.items.map((item) => (
                          <li
                            className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 first:pt-0"
                            key={item.id}
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-200">
                                {item.title_snapshot} × {item.quantity}
                              </p>
                              {item.selected_options &&
                                Object.keys(item.selected_options).length > 0 && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {Object.entries(item.selected_options)
                                      .map(
                                        ([key, value]) =>
                                          `${key}: ${String(value)}`,
                                      )
                                      .join(" · ")}
                                  </p>
                                )}
                            </div>
                            <p className="text-sm font-semibold text-slate-300">
                              {formatMoney(
                                item.price_snapshot * item.quantity,
                                currency,
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-cyber-border pt-4">
                        <p className="text-sm text-slate-400">
                          Итого:{" "}
                          <span className="font-bold text-white">
                            {formatMoney(order.total_amount, currency)}
                          </span>
                        </p>
                        {order.status === "NEW" && (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg bg-cyber-emerald px-4 py-2.5 text-sm font-bold text-[#07120d] transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-50"
                            onClick={() => {
                              payOrder(order.id);
                              onClose();
                            }}
                            type="button"
                          >
                            <CreditCard aria-hidden="true" size={16} />
                            Оплатить с баланса
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
