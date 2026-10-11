import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ShoppingCart, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { useToastStore } from "../store/useToastStore";
import type { Product } from "../types";

interface ImageZoomModalProps {
  product: Product | null;
  currency: string;
  onClose: () => void;
}

const getProductOptions = (product: Product): Record<string, string[]> => {
  const rawOptions = product.options ?? product.attributes?.options;
  if (!rawOptions || typeof rawOptions !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(rawOptions).filter(
      ([, values]) =>
        Array.isArray(values) &&
        values.length > 0 &&
        values.every((value) => typeof value === "string"),
    ),
  ) as Record<string, string[]>;
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

export function ProductDetailModal({
  product,
  currency,
  onClose,
}: ImageZoomModalProps) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addToCart = useCartStore((state) => state.addToCart);
  const setCartOpen = useCartStore((state) => state.setOpen);

  useEffect(() => {
    if (!product) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, product]);

  useEffect(() => {
    if (product) {
      setSelectedOptions(
        Object.fromEntries(
          Object.entries(getProductOptions(product)).map(([name, values]) => [
            name,
            values[0],
          ]),
        ),
      );
      setIsDescriptionExpanded(false);
      setPointer({ x: 0, y: 0 });
    }
  }, [product?.id]);

  if (!product) {
    return <AnimatePresence />;
  }

  const productOptions = getProductOptions(product);
  const attributes = Object.entries(product.attributes ?? {}).filter(
    ([key]) => key !== "options",
  );
  const inStock = product.is_available && product.stock > 0;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      useToastStore
        .getState()
        .showToast("Войдите или зарегистрируйтесь, чтобы добавить товар.", "warning");
      window.dispatchEvent(new Event("cybertech:auth-required"));
      return;
    }

    try {
      await addToCart(product, 1, selectedOptions);
      useToastStore.getState().showToast("Товар добавлен в корзину.", "success");
      setCartOpen(true);
      onClose();
    } catch (error) {
      useToastStore
        .getState()
        .showToast(
          error instanceof Error
            ? error.message
            : "Не удалось добавить товар в корзину.",
          "error",
        );
    }

  };

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setPointer({ x, y });
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          key={`product-detail-${product.id}`}
          animate={{ opacity: 1 }}
          className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#05060a]/95 p-3 backdrop-blur-xl sm:p-6"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.section
            aria-labelledby="product-detail-title"
            aria-modal="true"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative my-auto grid max-h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-cyber-border bg-[#131722] text-white shadow-[0_0_80px_rgba(6,182,212,0.12)] lg:grid-cols-[1.05fr_0.95fr] lg:overflow-hidden"
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Закрыть подробности товара"
              className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/50 p-2.5 text-white transition hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>

            <div
              className="flex min-h-[16rem] items-center justify-center overflow-hidden bg-[#080a10] p-5 [perspective:1200px] sm:min-h-[24rem] lg:min-h-[38rem]"
              onMouseLeave={() => setPointer({ x: 0, y: 0 })}
              onMouseMove={handlePointerMove}
            >
              {product.main_image_url ? (
                <motion.img
                  alt={product.title}
                  animate={{
                    rotateX: -pointer.y * 8,
                    rotateY: pointer.x * 8,
                    x: pointer.x * 14,
                    y: pointer.y * 14,
                  }}
                  className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-[0_0_80px_rgba(6,182,212,0.12)]"
                  src={product.main_image_url}
                  style={{ transformStyle: "preserve-3d" }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              ) : (
                <div className="text-sm text-slate-500">
                  Для этого товара нет изображения
                </div>
              )}
            </div>

            <div className="overflow-y-auto p-5 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyber-cyan">
                Подробная информация
              </p>
              <h2
                className="mt-3 pr-8 text-2xl font-black sm:text-3xl"
                id="product-detail-title"
              >
                {product.title}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-2xl font-black text-cyber-cyan">
                  {formatMoney(product.price, currency)}
                </p>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    inStock
                      ? "border-cyber-emerald/30 bg-cyber-emerald/10 text-cyber-emerald"
                      : "border-red-400/30 bg-red-400/10 text-red-300"
                  }`}
                >
                  {inStock ? `В наличии: ${product.stock}` : "Нет в наличии"}
                </span>
              </div>

              {product.description && (
                <div className="mt-5">
                  <p
                    className={`whitespace-pre-line text-sm leading-6 text-slate-400 ${
                      isDescriptionExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {product.description}
                  </p>
                  {product.description.length > 150 && (
                    <button
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-cyber-cyan hover:text-cyan-300"
                      onClick={() =>
                        setIsDescriptionExpanded((expanded) => !expanded)
                      }
                      type="button"
                    >
                      {isDescriptionExpanded ? "Свернуть" : "Читать далее"}
                      <ChevronDown
                        aria-hidden="true"
                        className={isDescriptionExpanded ? "rotate-180" : ""}
                        size={15}
                      />
                    </button>
                  )}
                </div>
              )}

              {Object.entries(productOptions).length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Вариации
                  </h3>
                  {Object.entries(productOptions).map(([name, values], index) => (
                    <label
                      className="flex items-center justify-between gap-4 text-sm text-slate-400"
                      key={`${name}-${index}`}
                    >
                      <span className="capitalize">{name}</span>
                      <select
                        aria-label={`Вариант: ${name}`}
                        className="max-w-[65%] rounded-lg border border-cyber-border bg-[#0b0d12] px-3 py-2 text-sm text-white outline-none focus:border-cyber-cyan"
                        onChange={(event) =>
                          setSelectedOptions((current) => ({
                            ...current,
                            [name]: event.target.value,
                          }))
                        }
                        value={selectedOptions[name] ?? values[0]}
                      >
                        {values.map((value, valueIndex) => (
                          <option key={`${value}-${valueIndex}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}

              {attributes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Характеристики
                  </h3>
                  <dl className="mt-3 divide-y divide-cyber-border rounded-xl border border-cyber-border bg-[#0b0d12]/50 px-4">
                    {attributes.map(([name, value], index) => (
                      <div
                        className="flex justify-between gap-4 py-3 text-sm"
                        key={`${name}-${index}`}
                      >
                        <dt className="text-slate-500">{name}</dt>
                        <dd className="text-right text-slate-200">
                          {Array.isArray(value)
                            ? value.join(", ")
                            : typeof value === "object" && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <button
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyber-cyan px-4 py-3 font-bold text-[#071015] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!inStock}
                onClick={() => void handleAddToCart()}
                type="button"
              >
                <ShoppingCart aria-hidden="true" size={18} />
                В корзину
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { ProductDetailModal as ImageZoomModal };
