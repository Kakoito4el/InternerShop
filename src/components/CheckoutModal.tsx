import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { useOrderStore } from "../store/useOrderStore";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheckoutForm {
  customer_name: string;
  phone: string;
  delivery_address: string;
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const checkout = useOrderStore((state) => state.checkout);
  const settings = useAppStore((state) => state.settings);
  const [form, setForm] = useState<CheckoutForm>({
    customer_name: user?.username ?? "",
    phone: "",
    delivery_address: "",
  });
  const [error, setError] = useState("");

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

  const total = getTotalPrice() + settings.delivery_fee;
  const canAfford = (user?.balance ?? 0) >= total;

  useEffect(() => {
    if (isOpen && user?.username) {
      setForm((current) => ({
        ...current,
        customer_name: current.customer_name || user.username,
      }));
    }
  }, [isOpen, user?.username]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!items.length) {
      setError("Корзина пуста.");
      return;
    }
    if (!canAfford) {
      setError("Недостаточно средств на виртуальном балансе.");
      return;
    }

    checkout(form);
    onClose();
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="checkout-modal-overlay"
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto pointer-events-auto"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleClose();
            }
          }}
        >
          <motion.section
            aria-labelledby="checkout-title"
            aria-modal="true"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-[101] my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#1E2638] bg-[#131722] p-6 text-white shadow-2xl"
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Закрыть оформление"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              onClick={handleClose}
              type="button"
            >
              <X size={19} />
            </button>

                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
                  Последний шаг
                </p>
                <h2
                  className="text-2xl font-bold text-white"
                  id="checkout-title"
                >
                  Оформление заказа
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Оплата виртуальным балансом аккаунта
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Имя получателя</span>
                    <input
                      autoComplete="name"
                      className="w-full rounded-xl border border-cyber-border bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition focus:border-cyber-cyan"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customer_name: event.target.value,
                        }))
                      }
                      required
                      value={form.customer_name}
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Телефон</span>
                    <input
                      autoComplete="tel"
                      className="w-full rounded-xl border border-cyber-border bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition focus:border-cyber-cyan"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="+7 (___) ___-__-__"
                      required
                      type="tel"
                      value={form.phone}
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Адрес доставки</span>
                    <textarea
                      autoComplete="street-address"
                      className="min-h-24 w-full resize-y rounded-xl border border-cyber-border bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition focus:border-cyber-cyan"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          delivery_address: event.target.value,
                        }))
                      }
                      required
                      value={form.delivery_address}
                    />
                  </label>

                  <div className="rounded-xl border border-cyber-emerald/20 bg-cyber-emerald/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyber-emerald">
                      Виртуальный баланс аккаунта
                    </p>
                    <div className="mt-3 flex justify-between text-sm text-slate-300">
                      <span>Ваш баланс</span>
                      <span>
                        {new Intl.NumberFormat("ru-RU", {
                          style: "currency",
                          currency: settings.currency || "USD",
                        }).format(user?.balance ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-base font-bold text-white">
                      <span>К оплате</span>
                      <span>
                        {new Intl.NumberFormat("ru-RU", {
                          style: "currency",
                          currency: settings.currency || "USD",
                        }).format(total)}
                      </span>
                    </div>
                  </div>

                  {error && (
                    <p
                      className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    className="w-full rounded-xl bg-cyber-emerald px-4 py-3 font-bold text-[#07120d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canAfford || !items.length}
                    type="submit"
                  >
                    Подтвердить и оплатить
                  </button>
                  {!canAfford && (
                    <p className="text-center text-xs text-red-300">
                      Недостаточно средств на балансе.
                    </p>
                  )}
                </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
