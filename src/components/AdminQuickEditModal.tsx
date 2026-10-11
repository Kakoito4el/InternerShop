import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useProductStore } from "../store/useProductStore";
import type { Product } from "../types";

interface AdminQuickEditModalProps {
  product: Product | null;
  onClose: () => void;
}

export function AdminQuickEditModal({
  product,
  onClose,
}: AdminQuickEditModalProps) {
  const role = useAuthStore((state) => state.user?.role);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const currency = useAppStore((state) => state.settings.currency);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!product) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "unset";
    };
  }, [product]);

  useEffect(() => {
    if (product) {
      setPrice(String(product.price));
      setStock(String(product.stock));
      setError("");
    }
  }, [product]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || role !== "ADMIN") {
      setError("Для редактирования товара необходимы права администратора.");
      return;
    }

    const nextPrice = Number(price);
    const nextStock = Number(stock);
    if (
      !Number.isFinite(nextPrice) ||
      nextPrice < 0 ||
      !Number.isInteger(nextStock) ||
      nextStock < 0
    ) {
      setError("Укажите неотрицательную цену и целый остаток.");
      return;
    }

    void updateProduct(product.id, {
      price: nextPrice,
      stock: nextStock,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          key="admin-quick-edit-overlay"
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
            aria-labelledby="admin-edit-title"
            aria-modal="true"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-[101] my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#1E2638] bg-[#131722] p-6 text-white shadow-2xl"
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Закрыть редактор"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={19} />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyber-purple/10 text-cyber-purple">
                <SlidersHorizontal aria-hidden="true" size={19} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyber-purple">
                  Admin tools
                </p>
                <h2
                  className="mt-1 font-bold text-white"
                  id="admin-edit-title"
                >
                  Быстрое редактирование
                </h2>
              </div>
            </div>
            <p className="mt-5 line-clamp-2 text-sm text-slate-300">
              {product.title}
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm text-slate-400">
                Цена ({currency})
                <input
                  autoFocus
                  className="w-full rounded-xl border border-cyber-border bg-[#0b0d12] px-4 py-3 text-white outline-none transition focus:border-cyber-purple"
                  min="0"
                  onChange={(event) => setPrice(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={price}
                />
              </label>
              <label className="block space-y-2 text-sm text-slate-400">
                Количество на складе
                <input
                  className="w-full rounded-xl border border-cyber-border bg-[#0b0d12] px-4 py-3 text-white outline-none transition focus:border-cyber-purple"
                  min="0"
                  onChange={(event) => setStock(event.target.value)}
                  required
                  step="1"
                  type="number"
                  value={stock}
                />
              </label>

              {error && (
                <p
                  className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-xl bg-cyber-purple px-4 py-3 font-bold text-white transition hover:bg-purple-500 disabled:cursor-wait disabled:opacity-50"
                  type="submit"
                >
                  Сохранить изменения
                </button>
                <button
                  className="rounded-xl border border-cyber-border px-4 py-3 text-slate-400 transition hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  Отмена
                </button>
              </div>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
