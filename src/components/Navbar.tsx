import { useEffect, useRef, useState } from "react";
import {
  LogIn,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { apiClient } from "../api/client";
import { AdminModal } from "./AdminModal";
import { AuthModal } from "./AuthModal";
import { CartDrawer } from "./CartDrawer";
import { OrdersModal } from "./OrdersModal";
import { ProfileModal } from "./ProfileModal";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { useProductStore } from "../store/useProductStore";
import type { Product } from "../types";

interface ProductSearchResponse {
  items?: Product[];
  products?: Product[];
  results?: Product[];
}

const getProducts = (data: Product[] | ProductSearchResponse): Product[] => {
  if (Array.isArray(data)) {
    return data;
  }

  const products = data.items ?? data.products ?? data.results;
  if (!products) {
    throw new Error("Сервер вернул неожиданный формат результатов поиска.");
  }

  return products;
};

const formatBalance = (balance: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(balance);

export function Navbar() {
  const { user, isAuthenticated } = useAuthStore();
  const { items: cartItems, isOpen: isCartOpen, setOpen: setCartOpen } =
    useCartStore();
  const setSelectedProduct = useProductStore((state) => state.setSelectedProduct);
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setProducts([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");

      try {
        const response = await apiClient.get<
          Product[] | ProductSearchResponse
        >("/api/v1/products/", {
          params: { search: normalizedQuery },
          signal: controller.signal,
        });
        setProducts(getProducts(response.data).slice(0, 5));
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchError("Не удалось загрузить результаты. Попробуйте позже.");
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const openAuthModal = () => setIsAuthOpen(true);
    window.addEventListener("cybertech:auth-required", openAuthModal);
    return () =>
      window.removeEventListener("cybertech:auth-required", openAuthModal);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-cyber-border bg-bg-primary/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6 lg:flex-nowrap">
          <a
            aria-label="CyberTech — главная"
            className="shrink-0 text-xl font-black tracking-[0.16em] text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.75)] sm:text-2xl"
            href="#home"
          >
            CYBER<span className="text-cyber-cyan">TECH</span>
          </a>

          <div
            className="relative order-3 w-full lg:order-none lg:mx-auto lg:max-w-xl"
            ref={searchContainerRef}
          >
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              aria-label="Поиск по каталогу"
              aria-expanded={isSearchOpen}
              className="w-full rounded-xl border border-cyber-border bg-bg-card py-3 pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyber-cyan/60"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Поиск устройств и аксессуаров..."
              value={query}
            />
            {query && (
              <button
                aria-label="Очистить поиск"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                onClick={() => setQuery("")}
                type="button"
              >
                <X size={16} />
              </button>
            )}

            {isSearchOpen && query.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-xl border border-cyber-border bg-bg-card shadow-2xl">
                {isSearching ? (
                  <p className="px-4 py-5 text-sm text-slate-400">
                    Поиск по каталогу...
                  </p>
                ) : searchError ? (
                  <p className="px-4 py-5 text-sm text-red-300">{searchError}</p>
                ) : products.length ? (
                  <ul>
                    {products.map((product, index) => (
                      <li key={`${product.id ?? "product"}-${index}`}>
                        <button
                          className="flex w-full items-center gap-3 border-b border-cyber-border/70 px-4 py-3 text-left transition last:border-0 hover:bg-white/5"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsSearchOpen(false);
                            setQuery("");
                          }}
                          type="button"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0b0d12] text-cyber-cyan">
                            {product.main_image_url ? (
                              <img
                                alt=""
                                className="h-full w-full object-cover"
                                src={product.main_image_url}
                              />
                            ) : (
                              <Package aria-hidden="true" size={18} />
                            )}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                            {product.title}
                          </span>
                          <span className="shrink-0 text-sm font-semibold text-cyber-emerald">
                            {formatBalance(product.price)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-5 text-sm text-slate-400">
                    Ничего не найдено.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <button
                  aria-label="Открыть профиль"
                  className="flex min-w-0 items-center gap-2 rounded-lg p-1 text-left transition hover:bg-white/5"
                  onClick={() => setIsProfileOpen(true)}
                  type="button"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-cyber-cyan/30 bg-[#131722] text-cyber-cyan">
                    {user.avatar_url ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={user.avatar_url}
                      />
                    ) : (
                      <UserRound aria-hidden="true" size={18} />
                    )}
                  </div>
                  <div className="hidden leading-tight sm:block">
                    <p className="max-w-28 truncate text-sm font-medium text-white">
                      {user.username}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {user.role === "ADMIN" && (
                        <ShieldCheck aria-hidden="true" size={11} />
                      )}
                      {user.role === "ADMIN" ? "ADMIN [Janibek]" : "USER"}
                    </p>
                  </div>
                </button>

                <span className="hidden rounded-lg border border-cyber-emerald/30 bg-cyber-emerald/10 px-3 py-2 text-sm font-bold text-cyber-emerald md:inline-flex">
                  {formatBalance(user.balance)}
                </span>
                <button
                  aria-label={`Открыть корзину, товаров: ${safeCartItems.reduce(
                    (total, item) => total + item.quantity,
                    0,
                  )}`}
                  className="relative rounded-lg border border-cyber-border p-2 text-slate-300 transition hover:border-cyber-cyan/40 hover:text-cyber-cyan"
                  onClick={() => setCartOpen(true)}
                  title="Корзина"
                  type="button"
                >
                  <ShoppingCart aria-hidden="true" size={18} />
                  {safeCartItems.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyber-cyan px-1 text-[10px] font-bold text-[#071015]">
                      {safeCartItems.reduce(
                        (total, item) => total + item.quantity,
                        0,
                      )}
                    </span>
                  )}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-cyber-border px-2 py-2 text-sm text-slate-300 transition hover:border-cyber-cyan/40 hover:text-white sm:px-3"
                  onClick={() => setIsOrdersOpen(true)}
                  type="button"
                >
                  <Package aria-hidden="true" size={16} />
                  <span className="hidden sm:inline">Мои заказы</span>
                </button>
                {user.role === "ADMIN" && (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-cyber-purple/40 bg-cyber-purple/10 px-2 py-2 text-sm font-semibold text-cyber-purple transition hover:bg-cyber-purple/20 sm:px-3"
                    onClick={() => setIsAdminOpen(true)}
                    type="button"
                  >
                    <ShieldCheck aria-hidden="true" size={16} />
                    <span className="hidden xl:inline">Панель Админа</span>
                    <span className="xl:hidden">Админ</span>
                  </button>
                )}
              </>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-cyber-cyan/40 bg-cyber-cyan/10 px-4 py-2.5 text-sm font-semibold text-cyber-cyan transition hover:bg-cyber-cyan/20"
                onClick={() => setIsAuthOpen(true)}
                type="button"
              >
                <LogIn aria-hidden="true" size={17} />
                <span className="hidden sm:inline">Войти / Регистрация</span>
                <span className="sm:hidden">Войти</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        key="modal-auth"
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
      <CartDrawer
        key="drawer-cart"
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
      />
      <ProfileModal
        key="modal-profile"
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <OrdersModal
        key="modal-orders"
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
      />
      {user?.role === "ADMIN" && (
        <AdminModal
          key="modal-admin"
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </>
  );
}
