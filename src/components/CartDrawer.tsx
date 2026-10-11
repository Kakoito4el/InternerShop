import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useCartStore } from "../store/useCartStore";
import { CheckoutModal } from "./CheckoutModal";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(price);

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, isLoading, getTotalPrice, updateQuantity, removeFromCart } =
    useCartStore();
  const safeItems = Array.isArray(items) ? items : [];
  const settings = useAppStore((state) => state.settings);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [error, setError] = useState("");
  const subtotal = getTotalPrice();
  const total = subtotal + settings.delivery_fee;

  const handleQuantityChange = async (
    action: () => Promise<void>,
  ) => {
    setError("");
    try {
      await action();
    } catch {
      setError("Не удалось обновить корзину. Попробуйте ещё раз.");
    }
  };

  const openCheckout = () => {
    setIsCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    if (useCartStore.getState().items.length === 0) {
      onClose();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Fragment key="cart-drawer-content">
            <motion.button
              key="cart-drawer-backdrop"
              aria-label="Закрыть корзину"
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[70] cursor-default bg-black/60 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={onClose}
              type="button"
            />
            <motion.aside
              key="cart-drawer-panel"
              aria-label="Корзина"
              aria-modal="true"
              className="fixed bottom-0 right-0 top-0 z-[75] flex w-full max-w-md flex-col border-l border-cyber-border bg-[#131722]/90 shadow-2xl backdrop-blur-xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              role="dialog"
            >
              <div className="flex items-center justify-between border-b border-cyber-border px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
                    CyberTech
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">
                    Корзина{" "}
                    <span className="text-sm font-medium text-slate-500">
                      (
                      {safeItems.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )}
                      )
                    </span>
                  </h2>
                </div>
                <button
                  aria-label="Закрыть корзину"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {isLoading && safeItems.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">
                    Загружаем корзину...
                  </p>
                ) : safeItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <ShoppingBag
                      aria-hidden="true"
                      className="text-slate-600"
                      size={44}
                      strokeWidth={1.2}
                    />
                    <p className="mt-4 font-semibold text-slate-300">
                      Корзина пока пуста
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Добавьте устройства из каталога.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {safeItems.map((item) => {
                      const product = item.product;
                      return (
                        <li
                          className="flex gap-4 rounded-xl border border-cyber-border bg-[#0b0d12]/60 p-3"
                          key={item.id}
                        >
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-bg-card">
                            {product?.main_image_url ? (
                              <img
                                alt=""
                                className="h-full w-full object-cover"
                                src={product.main_image_url}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-cyber-cyan/60">
                                <ShoppingBag size={22} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 text-sm font-semibold text-white">
                                {product?.title ?? `Товар #${item.product_id}`}
                              </h3>
                              <button
                                aria-label="Удалить товар"
                                className="shrink-0 p-1 text-slate-500 transition hover:text-red-300"
                                onClick={() =>
                                  void handleQuantityChange(() =>
                                    removeFromCart(item.id),
                                  )
                                }
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <p className="mt-1 text-sm font-bold text-cyber-cyan">
                              {formatPrice(
                                (product?.price ?? 0) * item.quantity,
                                settings.currency,
                              )}
                            </p>
                            {item.selected_options &&
                              Object.keys(item.selected_options).length > 0 && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {Object.entries(item.selected_options)
                                    .map(([name, value]) => `${name}: ${String(value)}`)
                                    .join(" · ")}
                                </p>
                              )}
                            <div className="mt-2 inline-flex items-center rounded-lg border border-cyber-border">
                              <button
                                aria-label="Уменьшить количество"
                                className="p-1.5 text-slate-400 transition hover:text-white disabled:opacity-40"
                                disabled={item.quantity <= 1}
                                onClick={() =>
                                  void handleQuantityChange(() =>
                                    updateQuantity(item.id, item.quantity - 1),
                                  )
                                }
                                type="button"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="min-w-8 text-center text-sm text-white">
                                {item.quantity}
                              </span>
                              <button
                                aria-label="Увеличить количество"
                                className="p-1.5 text-slate-400 transition hover:text-white disabled:opacity-40"
                                disabled={
                                  product !== null &&
                                  product !== undefined &&
                                  item.quantity >= product.stock
                                }
                                onClick={() =>
                                  void handleQuantityChange(() =>
                                    updateQuantity(item.id, item.quantity + 1),
                                  )
                                }
                                type="button"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-3 border-t border-cyber-border px-6 py-5">
                {error && (
                  <p className="text-sm text-red-300" role="alert">
                    {error}
                  </p>
                )}
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Товары</span>
                  <span>{formatPrice(subtotal, settings.currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Доставка</span>
                  <span>
                    {settings.delivery_fee === 0
                      ? "Бесплатно"
                      : formatPrice(
                          settings.delivery_fee,
                          settings.currency,
                        )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-cyber-border pt-3 text-lg font-bold text-white">
                  <span>Итого</span>
                  <span className="text-cyber-emerald">
                    {formatPrice(total, settings.currency)}
                  </span>
                </div>
                <button
                  className="w-full rounded-xl bg-cyber-cyan px-4 py-3 font-bold text-[#071015] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!safeItems.length || isLoading}
                  onClick={openCheckout}
                  type="button"
                >
                  Перейти к оформлению
                </button>
              </div>
            </motion.aside>
          </Fragment>
        )}
      </AnimatePresence>

      <CheckoutModal
        key="modal-checkout"
        isOpen={isCheckoutOpen}
        onClose={closeCheckout}
      />
    </>
  );
}
