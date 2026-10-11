import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Eye,
  Package,
  Info,
  ShoppingCart,
} from "lucide-react";
import { AdminQuickEditModal } from "./AdminQuickEditModal";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useProductStore } from "../store/useProductStore";
import { useCartStore } from "../store/useCartStore";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  index: number;
}

const formatPrice = (price: number, currency: string) => {
  const supportedCurrency = currency.toUpperCase();

  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: supportedCurrency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price.toLocaleString("ru-RU")} ${currency}`;
  }
};

const getAttributeEntries = (attributes: Product["attributes"]) => {
  if (!attributes) {
    return [];
  }

  return Object.entries(attributes)
    .filter(
      ([, value]) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean",
    )
    .slice(0, 3);
};

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

export function ProductCard({ product, index }: ProductCardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const currency = useAppStore((state) => state.settings.currency);
  const { setSelectedProduct } = useProductStore();
  const { addToCart, setOpen: setCartOpen } = useCartStore();
  const [notice, setNotice] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const productOptions = getProductOptions(product);
  const defaultSelectedOptions = Object.fromEntries(
    Object.entries(productOptions).map(([name, values]) => [name, values[0]]),
  );
  const attributes = getAttributeEntries(product.attributes);
  const inStock = product.is_available && product.stock > 0;

  const handleAddToCart = async () => {
    setNotice("");

    if (!isAuthenticated) {
      setNotice("Войдите или зарегистрируйтесь, чтобы добавить товар.");
      window.dispatchEvent(new Event("cybertech:auth-required"));
      return;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(product, 1, defaultSelectedOptions);
      setNotice("Товар добавлен в корзину.");
      setCartOpen(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Не удалось добавить товар в корзину.",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="group overflow-hidden rounded-2xl border border-cyber-border bg-bg-card transition-colors hover:border-cyber-cyan/30"
      id={`product-${product.id}`}
      initial={{ opacity: 0, y: 22 }}
      transition={{ delay: Math.min(index * 0.055, 0.35), duration: 0.4 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0d12]">
        {product.main_image_url ? (
          <img
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            src={product.main_image_url}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-cyber-cyan/40">
            <Package aria-hidden="true" size={42} strokeWidth={1.2} />
          </div>
        )}
        <button
          aria-label={`Быстрый просмотр: ${product.title}`}
          className="absolute right-3 top-3 rounded-xl border border-white/10 bg-black/60 p-2.5 text-white opacity-100 backdrop-blur transition hover:bg-cyber-cyan/20 hover:text-cyber-cyan sm:opacity-0 sm:group-hover:opacity-100"
          onClick={() => setSelectedProduct(product)}
          type="button"
        >
          <Eye aria-hidden="true" size={18} />
        </button>
        <span
          className={`absolute bottom-3 left-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur ${
            inStock
              ? "border-cyber-emerald/30 bg-black/60 text-cyber-emerald"
              : "border-red-400/30 bg-black/60 text-red-300"
          }`}
        >
          {inStock ? `В наличии: ${product.stock}` : "Нет в наличии"}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="min-h-14">
          <h3 className="line-clamp-2 font-semibold leading-6 text-white">
            {product.title}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
              {product.description}
            </p>
          )}
        </div>

        {attributes.length > 0 && (
          <dl className="flex min-h-7 flex-wrap gap-2">
            {attributes.map(([key, value]) => (
              <div
                className="rounded-md border border-cyber-border bg-[#0b0d12]/70 px-2 py-1 text-xs text-slate-400"
                key={key}
              >
                <dt className="sr-only">{key}</dt>
                <dd>
                  {key}: {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-cyber-border pt-4">
          <p className="text-xl font-bold text-cyber-cyan">
            {formatPrice(product.price, currency)}
          </p>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-cyber-cyan px-3 py-2.5 text-sm font-bold text-[#071015] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!inStock}
            onClick={() => void handleAddToCart()}
            type="button"
          >
            {notice === "Товар добавлен в корзину." ? (
              <Check aria-hidden="true" size={16} />
            ) : (
              <ShoppingCart aria-hidden="true" size={16} />
            )}
            {isAddingToCart ? "Добавление..." : "В корзину"}
          </button>
        </div>
        <button
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-cyber-cyan"
          onClick={() => setSelectedProduct(product)}
          type="button"
        >
          <Info aria-hidden="true" size={15} />
          Подробности
        </button>

        {notice && (
          <p
            className={`text-xs ${
              notice === "Товар добавлен в корзину."
                ? "text-cyber-emerald"
                : "text-cyber-amber"
            }`}
            role="status"
          >
            {notice}
          </p>
        )}

        {user?.role === "ADMIN" && (
          <div className="border-t border-cyber-border pt-3">
            <button
              className="text-xs font-semibold text-cyber-purple transition hover:text-purple-300"
              onClick={() => setIsQuickEditOpen(true)}
              type="button"
            >
              Быстрое редактирование цены/остатка
            </button>
          </div>
        )}
      </div>
      <AdminQuickEditModal
        onClose={() => setIsQuickEditOpen(false)}
        product={isQuickEditOpen ? product : null}
      />
    </motion.article>
  );
}
