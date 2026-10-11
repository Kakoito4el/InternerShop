import { useEffect, useMemo, useRef } from "react";
import { CursorTrail } from "./components/CursorTrail";
import { CategoryBar } from "./components/CategoryBar";
import { Navbar } from "./components/Navbar";
import { ProductDetailModal } from "./components/ImageZoomModal";
import { ProductCard } from "./components/ProductCard";
import { ToastContainer } from "./components/ToastContainer";
import { seedCyberTechData } from "./api/seed";
import { useAppStore } from "./store/useAppStore";
import { useAuthStore } from "./store/useAuthStore";
import { useCartStore } from "./store/useCartStore";
import { useProductStore } from "./store/useProductStore";

function App() {
  const seedingStarted = useRef(false);
  const {
    settings,
    settingsError,
    fetchSettings,
  } = useAppStore();
  const {
    products,
    selectedCategoryId,
    sortBy,
    searchQuery,
    selectedProduct,
    isLoadingCategories,
    isLoadingProducts,
    catalogError,
    categories,
    fetchCategories,
    fetchProducts,
    setSelectedProduct,
  } = useProductStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const userRole = useAuthStore((state) => state.user?.role);
  const cartItems = useCartStore((state) => state.items);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ru");
  const visibleProducts = useMemo(() => {
    const filteredProducts = products.filter((product) => {
      if (product.category_id !== selectedCategoryId) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        product.title,
        product.description ?? "",
        ...Object.entries(product.attributes ?? {}).flatMap(([key, value]) => [
          key,
          String(value),
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase("ru");

      return searchableText.includes(normalizedQuery);
    });

    return filteredProducts.sort((first, second) => {
      switch (sortBy) {
        case "price-desc":
          return second.price - first.price;
        case "name-asc":
          return first.title.localeCompare(second.title, "ru");
        case "name-desc":
          return second.title.localeCompare(first.title, "ru");
        case "stock":
          return (
            Number(second.is_available && second.stock > 0) -
              Number(first.is_available && first.stock > 0) ||
            second.stock - first.stock
          );
        case "price-asc":
        default:
          return first.price - second.price;
      }
    });
  }, [normalizedQuery, products, selectedCategoryId, sortBy]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("cybertech_theme");
    const themeAccents: Record<string, string> = {
      "dark-cyberpunk": "#06B6D4",
      "matrix-green": "#22C55E",
      "light-neon": "#0891B2",
    };
    if (savedTheme && themeAccents[savedTheme]) {
      document.documentElement.dataset.theme = savedTheme;
      document.documentElement.style.setProperty(
        "--accent-color",
        themeAccents[savedTheme],
      );
    }

    const authStore = useAuthStore.getState();
    const savedToken =
      authStore.token ??
      localStorage.getItem("token") ??
      localStorage.getItem("access_token");
    if (savedToken) {
      void authStore.fetchMe().catch((error: unknown) => {
        console.error("Не удалось восстановить сессию пользователя.", error);
      });
    } else {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        sessionChecked: true,
      });
      useCartStore.getState().resetSession();
    }
    void fetchCategories()
      .then(() => fetchProducts())
      .catch((error: unknown) => {
        console.error("Не удалось загрузить категории и товары.", error);
      });
    void fetchSettings().catch((error: unknown) => {
      console.error("Не удалось загрузить настройки магазина.", error);
    });
  }, []);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }

    if (!isAuthenticated) {
      useCartStore.getState().resetSession();
      return;
    }

    const token =
      useAuthStore.getState().token ??
      localStorage.getItem("token") ??
      localStorage.getItem("access_token");
    if (!token) {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      useCartStore.getState().resetSession();
      return;
    }

    void fetchCart().catch((error: unknown) => {
      console.error("Не удалось загрузить корзину пользователя.", error);
    });
  }, [fetchCart, isAuthenticated, sessionChecked]);

  useEffect(() => {
    if (userRole !== "ADMIN" || isLoadingCategories || seedingStarted.current) {
      return;
    }

    seedingStarted.current = true;
    void seedCyberTechData()
      .then(async (seeded) => {
        if (seeded) {
          await Promise.all([fetchCategories(), fetchProducts()]);
        }
      })
      .catch((error: unknown) => {
        seedingStarted.current = false;
        console.error("Не удалось заполнить каталог тестовыми данными.", error);
      });
  }, [
    categories.length,
    fetchCategories,
    fetchProducts,
    isLoadingCategories,
    userRole,
  ]);

  return (
    <div className="min-h-screen bg-bg-primary text-white" id="home">
      <Navbar />
      <CursorTrail />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <section className="mb-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-cyber-purple sm:text-sm">
            Технологии нового поколения
          </p>
          <h1 className="text-4xl font-black tracking-[0.1em] text-white drop-shadow-[0_0_24px_rgba(6,182,212,0.25)] sm:text-6xl">
            {settings.store_name || "CyberTech"}
            <span className="text-cyber-cyan">.</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400">
            <p>Выберите технику для своей следующей сборки.</p>
            <p className="text-cyber-emerald">
              В корзине:{" "}
              {(Array.isArray(cartItems) ? cartItems : []).reduce(
                (total, item) => total + item.quantity,
                0,
              )}
            </p>
          </div>
        </section>

        {settingsError && (
          <p
            className="mb-6 rounded-xl border border-cyber-amber/20 bg-cyber-amber/5 px-4 py-3 text-sm text-cyber-amber"
            role="status"
          >
            {settingsError} Используются настройки по умолчанию.
          </p>
        )}

        <div className="space-y-8">
          <CategoryBar />

          {catalogError && (
            <p
              className="rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {catalogError}
            </p>
          )}

          {isLoadingCategories && categories.length === 0 && (
            <p className="text-sm text-slate-500">Загрузка категорий...</p>
          )}

          {isLoadingProducts && products.length === 0 ? (
            <p className="py-12 text-center text-slate-400">
              Загружаем каталог...
            </p>
          ) : visibleProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  index={index}
                  key={product.id ? `product-${product.id}` : `product-index-${index}`}
                  product={product}
                />
              ))}
            </div>
          ) : (
            !catalogError && (
              <div className="rounded-2xl border border-dashed border-cyber-border px-6 py-16 text-center">
                <p className="text-lg font-semibold text-slate-300">
                  {searchQuery
                    ? "По вашему запросу ничего не найдено."
                    : "В этой категории пока нет товаров."}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Попробуйте изменить запрос или выбрать другую категорию.
                </p>
              </div>
            )
          )}
        </div>
      </main>
      <ProductDetailModal
        key="modal-zoom"
        currency={settings.currency}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
      />
      <ToastContainer key="toast-container" />
    </div>
  );
}

export default App;
