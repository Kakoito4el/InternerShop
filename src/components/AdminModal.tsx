import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Check,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useOrderStore } from "../store/useOrderStore";
import { useProductStore } from "../store/useProductStore";
import { apiClient } from "../api/client";
import { useToastStore } from "../store/useToastStore";
import type { Category, Order, OrderStatus, Product, User } from "../types";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = "products" | "categories" | "orders";
type BalanceDirection = "credit" | "debit";

interface ProductFormState {
  title: string;
  description: string;
  price: string;
  stock: string;
  category_id: string;
  main_image_url: string;
  unit: string;
  attributes: string;
}

const emptyProductForm: ProductFormState = {
  title: "",
  description: "",
  price: "0",
  stock: "0",
  category_id: "",
  main_image_url: "",
  unit: "шт.",
  attributes: "{}",
};

const orderStatuses: OrderStatus[] = [
  "NEW",
  "PAID",
  "DELIVERING",
  "COMPLETED",
  "CANCELLED",
];

const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  DELIVERING: "Доставляется",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const inputClass =
  "w-full rounded-xl border border-cyber-border bg-[#0b0d12] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyber-purple";

const formatCurrency = (amount: number, currency: string) => {
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

const toProductForm = (product: Product): ProductFormState => ({
  title: product.title,
  description: product.description ?? "",
  price: String(product.price),
  stock: String(product.stock),
  category_id: product.category_id === undefined ? "" : String(product.category_id),
  main_image_url: product.main_image_url ?? "",
  unit: product.unit ?? "шт.",
  attributes: JSON.stringify(product.attributes ?? {}, null, 2),
});

const parseAttributes = (source: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(source || "{}");
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Атрибуты должны быть JSON-объектом.");
  }
  return parsed as Record<string, unknown>;
};

const categoryName = (categories: Category[], categoryId?: number) =>
  categories.find((category) => category.id === categoryId)?.name ?? "Без категории";

const slugFromName = (value: string) => {
  const transliteration: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLocaleLowerCase("ru")
    .split("")
    .map((character) => transliteration[character] ?? character)
    .join("")
    .replace(/ъ|ь/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const displayOrderNumber = (order: Order) =>
  order.id < 0 ? "создаётся" : `#${order.id}`;

const isAdminUser = (value: unknown): value is User => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.username === "string" &&
    typeof candidate.balance === "number" &&
    (candidate.role === "USER" || candidate.role === "ADMIN")
  );
};

const extractAdminUsers = (data: unknown): User[] => {
  if (Array.isArray(data)) {
    return data.filter(isAdminUser);
  }
  if (typeof data !== "object" || data === null) {
    return [];
  }
  const response = data as Record<string, unknown>;
  for (const key of ["users", "items", "data"]) {
    if (key in response) {
      const users = extractAdminUsers(response[key]);
      if (users.length > 0 || Array.isArray(response[key])) {
        return users;
      }
    }
  }
  return [];
};

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const role = useAuthStore((state) => state.user?.role);
  const currency = useAppStore((state) => state.settings.currency);
  const {
    categories,
    products,
    categoryThemes,
    fetchCategories,
    fetchProducts,
    createProduct,
    saveProduct,
    deleteProduct,
    createCategory,
  } = useProductStore();
  const orders = useOrderStore((state) => state.orders);
  const fetchAdminOrders = useOrderStore((state) => state.fetchAdminOrders);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);

  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productForm, setProductForm] =
    useState<ProductFormState>(emptyProductForm);
  const [productFormError, setProductFormError] = useState("");
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categorySlugInput, setCategorySlugInput] = useState("");
  const [categoryColor, setCategoryColor] = useState("#A855F7");
  const [categoryFormError, setCategoryFormError] = useState("");
  const [balanceUsername, setBalanceUsername] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDirection, setBalanceDirection] =
    useState<BalanceDirection>("credit");
  const [adminUsers, setAdminUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!isOpen || role !== "ADMIN") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void fetchCategories().catch((error: unknown) => {
      console.error("Не удалось загрузить категории для панели администратора.", error);
    });
    void fetchProducts().catch((error: unknown) => {
      console.error("Не удалось загрузить товары для панели администратора.", error);
    });
    void fetchAdminOrders().catch((error: unknown) => {
      console.error("Не удалось загрузить заказы клиентов.", error);
    });
    void apiClient
      .get<unknown>("/api/v1/admin/users")
      .then((response) => {
        const mockBalances = useAuthStore.getState().mockBalances;
        setAdminUsers(
          extractAdminUsers(response.data).map((user) => ({
            ...user,
            balance:
              mockBalances[user.username.trim().toLocaleLowerCase()] ??
              user.balance,
          })),
        );
      })
      .catch(() => {
        useToastStore
          .getState()
          .showToast("Не удалось загрузить список пользователей.", "error");
      });

    return () => {
      document.body.style.overflow = previousOverflow || "unset";
    };
  }, [
    fetchAdminOrders,
    fetchProducts,
    fetchCategories,
    isOpen,
    role,
  ]);

  const sortedProducts = useMemo(
    () => [...products].sort((first, second) => second.id - first.id),
    [products],
  );

  if (!isOpen || role !== "ADMIN") {
    return null;
  }

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductFormError("");
    setIsProductFormOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm(toProductForm(product));
    setProductFormError("");
    setIsProductFormOpen(true);
  };

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(productForm.price);
    const stock = Number(productForm.stock);

    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setProductFormError("Укажите неотрицательную цену и целый остаток.");
      return;
    }

    let attributes: Record<string, unknown>;
    try {
      attributes = parseAttributes(productForm.attributes);
    } catch {
      setProductFormError("Атрибуты должны быть корректным JSON-объектом.");
      return;
    }

    const payload = {
      title: productForm.title.trim(),
      description: productForm.description.trim() || undefined,
      price,
      stock,
      category_id: productForm.category_id
        ? Number(productForm.category_id)
        : undefined,
      main_image_url: productForm.main_image_url.trim() || undefined,
      unit: productForm.unit.trim() || undefined,
      attributes,
      is_available: stock > 0,
    };

    if (!payload.title) {
      setProductFormError("Введите название товара.");
      return;
    }

    setIsProductFormOpen(false);
    setProductFormError("");
    if (editingProduct) {
      void saveProduct(editingProduct.id, payload).catch((error: unknown) => {
        console.error("Не удалось сохранить товар из панели администратора.", error);
      });
    } else {
      void createProduct(payload).catch((error: unknown) => {
        console.error("Не удалось создать товар из панели администратора.", error);
      });
    }
  };

  const handleCategorySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryNameInput.trim();
    const slug = categorySlugInput.trim().toLocaleLowerCase("en");
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setCategoryFormError("Укажите название и корректный slug (латиница, цифры, дефис).");
      return;
    }
    if (categories.some((category) => category.slug === slug)) {
      setCategoryFormError("Категория с таким slug уже существует.");
      return;
    }

    setCategoryFormError("");
    setCategoryNameInput("");
    setCategorySlugInput("");
    void createCategory({ name, slug, themeColor: categoryColor }).catch(
      (error: unknown) => {
        console.error("Не удалось создать категорию из панели администратора.", error);
      },
    );
  };

  const handleMockBalanceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(balanceAmount);
    if (!balanceUsername.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const authStore = useAuthStore.getState();
    const matchedUser = adminUsers.find(
      (user) =>
        user.username.trim().toLocaleLowerCase() ===
        balanceUsername.trim().toLocaleLowerCase(),
    );
    if (!matchedUser) {
      useToastStore.getState().showToast("Пользователь не найден.", "error");
      return;
    }

    if (
      authStore.adjustMockBalance(
        balanceUsername,
        amount,
        balanceDirection,
        adminUsers,
      )
    ) {
      const updatedBalance =
        useAuthStore.getState().mockBalances[
          matchedUser.username.trim().toLocaleLowerCase()
        ];
      if (updatedBalance !== undefined) {
        setAdminUsers((users) =>
          users.map((user) =>
            user.id === matchedUser.id
              ? { ...user, balance: updatedBalance }
              : user,
          ),
        );
      }
      setBalanceUsername("");
      setBalanceAmount("");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="admin-modal-overlay"
        animate={{ opacity: 1 }}
        className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-5"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.section
          aria-labelledby="admin-modal-title"
          aria-modal="true"
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-[101] my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#1E2638] bg-[#131722] text-white shadow-2xl sm:max-h-[calc(100vh-2.5rem)]"
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="flex items-center justify-between border-b border-cyber-border px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyber-purple/30 bg-cyber-purple/10 text-cyber-purple">
                <ShieldCheck aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyber-purple">
                  CyberTech Control
                </p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl" id="admin-modal-title">
                  Панель администратора
                </h2>
              </div>
            </div>
            <button
              aria-label="Закрыть панель администратора"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={21} />
            </button>
          </header>

          <nav aria-label="Разделы панели" className="flex gap-2 overflow-x-auto border-b border-cyber-border px-5 py-3 sm:px-7">
            {([
              ["products", "Товары", Package],
              ["categories", "Категории", Boxes],
              ["orders", "Заказы клиентов", Check],
            ] as const).map(([tab, label, Icon], index) => (
              <button
                aria-pressed={activeTab === tab}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "border-cyber-purple/40 bg-cyber-purple/10 text-cyber-purple"
                    : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
                key={`${tab ?? "tab"}-${index}`}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                <Icon aria-hidden="true" size={16} />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7">
            {activeTab === "products" && (
              <section aria-label="Управление товарами">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">Каталог товаров</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {sortedProducts.length} позиций
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-cyber-purple px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-500"
                    onClick={openCreateProduct}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={17} />
                    Добавить товар
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-cyber-border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-[#0b0d12]/80 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Товар</th>
                        <th className="px-4 py-3">Категория</th>
                        <th className="px-4 py-3">Цена</th>
                        <th className="px-4 py-3">Остаток</th>
                        <th className="px-4 py-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyber-border/70">
                      {sortedProducts.map((product, index) => (
                        <tr
                          className="transition hover:bg-white/[0.025]"
                          key={product.id ? `admin-product-${product.id}` : `product-idx-${index}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cyber-border bg-[#0b0d12] text-slate-600">
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
                              <span className="max-w-xs truncate font-semibold text-slate-200">
                                {product.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {categoryName(categories, product.category_id)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-cyber-emerald">
                            {formatCurrency(product.price, currency)}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{product.stock}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                aria-label={`Редактировать ${product.title}`}
                                className="rounded-lg border border-cyber-border p-2 text-slate-400 transition hover:border-cyber-purple/40 hover:text-cyber-purple"
                                onClick={() => openEditProduct(product)}
                                type="button"
                              >
                                <Pencil aria-hidden="true" size={15} />
                              </button>
                              <button
                                aria-label={`Удалить ${product.title}`}
                                className="rounded-lg border border-cyber-border p-2 text-slate-400 transition hover:border-red-400/40 hover:text-red-300"
                                onClick={() => {
                                  if (window.confirm(`Удалить товар «${product.title}»?`)) {
                                    void deleteProduct(product.id).catch((error: unknown) => {
                                      console.error("Не удалось удалить товар.", error);
                                    });
                                  }
                                }}
                                type="button"
                              >
                                <Trash2 aria-hidden="true" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {sortedProducts.length === 0 && (
                        <tr>
                          <td className="px-4 py-12 text-center text-slate-500" colSpan={5}>
                            Товары не найдены.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === "categories" && (
              <section aria-label="Управление категориями" className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                <div>
                  <h3 className="mb-4 text-lg font-bold">Категории каталога</h3>
                  <div className="space-y-2">
                    {categories.map((category, index) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-xl border border-cyber-border bg-[#0b0d12]/50 px-4 py-3"
                        key={
                          category.id
                            ? `admin-item-${category.id}`
                            : `admin-idx-${index}`
                        }
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor: categoryThemes[category.slug] ?? "#06B6D4",
                              boxShadow: `0 0 12px ${categoryThemes[category.slug] ?? "#06B6D4"}`,
                            }}
                          />
                          <span className="truncate font-medium text-slate-200">{category.name}</span>
                        </div>
                        <code className="shrink-0 text-xs text-slate-500">{category.slug}</code>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="rounded-xl border border-dashed border-cyber-border p-6 text-center text-sm text-slate-500">
                        Категорий пока нет.
                      </p>
                    )}
                  </div>
                </div>

                <form
                  className="h-fit space-y-4 rounded-xl border border-cyber-border bg-[#0b0d12]/45 p-4 sm:p-5"
                  onSubmit={handleCategorySubmit}
                >
                  <div>
                    <h3 className="font-bold">Новая категория</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Цвет темы сохраняется в настройках этого браузера.
                    </p>
                  </div>
                  <label className="block space-y-1.5 text-xs text-slate-400">
                    Название
                    <input
                      className={inputClass}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCategoryNameInput(value);
                        if (!categorySlugInput) {
                          setCategorySlugInput(slugFromName(value));
                        }
                      }}
                      required
                      value={categoryNameInput}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs text-slate-400">
                    Slug
                    <input
                      className={inputClass}
                      onChange={(event) => setCategorySlugInput(event.target.value)}
                      required
                      value={categorySlugInput}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-cyber-border px-3 py-2.5 text-sm text-slate-300">
                    Цвет темы
                    <input
                      aria-label="Цвет темы категории"
                      className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                      onChange={(event) => setCategoryColor(event.target.value)}
                      type="color"
                      value={categoryColor}
                    />
                  </label>
                  {categoryFormError && (
                    <p className="text-xs text-red-300" role="alert">
                      {categoryFormError}
                    </p>
                  )}
                  <button
                    className="w-full rounded-lg bg-cyber-purple px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-500"
                    type="submit"
                  >
                    Создать категорию
                  </button>
                </form>
              </section>
            )}

            {activeTab === "orders" && (
              <section aria-label="Заказы клиентов">
                <form
                  className="mb-6 grid gap-3 rounded-xl border border-cyber-purple/30 bg-cyber-purple/5 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
                  onSubmit={handleMockBalanceSubmit}
                >
                  <label className="block space-y-1.5 text-xs text-slate-400">
                    Пополнить баланс пользователя
                    <input
                      autoComplete="off"
                      className={inputClass}
                      onChange={(event) => setBalanceUsername(event.target.value)}
                      placeholder="Логин"
                      required
                      value={balanceUsername}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs text-slate-400">
                    Сумма ($)
                    <input
                      className={inputClass}
                      min="0.01"
                      onChange={(event) => setBalanceAmount(event.target.value)}
                      required
                      step="0.01"
                      type="number"
                      value={balanceAmount}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      aria-pressed={balanceDirection === "credit"}
                      className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                        balanceDirection === "credit"
                          ? "bg-cyber-emerald text-[#07110d]"
                          : "border border-cyber-border text-slate-400 hover:text-white"
                      }`}
                      onClick={() => setBalanceDirection("credit")}
                      type="button"
                    >
                      Пополнить (+)
                    </button>
                    <button
                      aria-pressed={balanceDirection === "debit"}
                      className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                        balanceDirection === "debit"
                          ? "bg-red-500 text-white"
                          : "border border-cyber-border text-slate-400 hover:text-white"
                      }`}
                      onClick={() => setBalanceDirection("debit")}
                      type="button"
                    >
                      Списать (−)
                    </button>
                  </div>
                  <button
                    className="rounded-lg bg-cyber-purple px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-500 sm:col-span-3"
                    type="submit"
                  >
                    Применить
                  </button>
                  <p className="text-xs text-slate-500 sm:col-span-3">
                    Демо-режим: проверка пользователя выполняется по списку API, баланс меняется локально; запрос на изменение баланса не отправляется.
                  </p>
                </form>
                <div className="mb-4">
                  <h3 className="text-lg font-bold">Все заказы</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Изменение статуса синхронизируется автоматически.
                  </p>
                </div>
                <div className="space-y-3">
                  {orders.map((order, index) => (
                    <article
                      className="rounded-xl border border-cyber-border bg-[#0b0d12]/45 p-4 sm:p-5"
                      key={
                        order.id
                          ? `admin-item-${order.id}`
                          : `admin-idx-${index}`
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold text-white">
                            Заказ {displayOrderNumber(order)}
                            <span className="ml-2 text-sm font-normal text-slate-400">
                              {order.customer_name || `Пользователь #${order.user_id}`}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(order.created_at).toLocaleString("ru-RU")}
                            {order.phone ? ` · ${order.phone}` : ""}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          Статус
                          <select
                            aria-label={`Статус заказа ${displayOrderNumber(order)}`}
                            className="rounded-lg border border-cyber-border bg-[#131722] px-2.5 py-2 text-sm text-cyber-cyan outline-none focus:border-cyber-purple"
                            disabled={order.id < 0}
                            onChange={(event) =>
                              updateOrderStatus(order.id, event.target.value as OrderStatus)
                            }
                            value={order.status}
                          >
                            {orderStatuses.map((status) => (
                              <option key={status} value={status}>
                                {orderStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-cyber-border/70 pt-3">
                        <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-400">
                          {order.items.slice(0, 3).map((item, index) => (
                            <p
                              className="truncate"
                              key={
                                item.id
                                  ? `admin-item-${item.id}`
                                  : `admin-idx-${index}`
                              }
                            >
                              {item.title_snapshot} × {item.quantity}
                            </p>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-slate-500">
                              + ещё {order.items.length - 3} поз.
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 font-bold text-cyber-emerald">
                          {formatCurrency(order.total_amount, currency)}
                        </p>
                      </div>
                    </article>
                  ))}
                  {orders.length === 0 && (
                    <p className="rounded-xl border border-dashed border-cyber-border px-5 py-12 text-center text-sm text-slate-500">
                      Заказов пока нет.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {isProductFormOpen && (
          <motion.div
            key="admin-product-form-overlay"
            animate={{ opacity: 1 }}
            className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsProductFormOpen(false);
              }
            }}
          >
            <motion.section
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1E2638] bg-[#131722] p-5 text-white shadow-2xl sm:p-7"
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-product-form-title"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-xl font-black" id="admin-product-form-title">
                  {editingProduct ? "Редактировать товар" : "Новый товар"}
                </h3>
                <button
                  aria-label="Закрыть форму товара"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                  onClick={() => setIsProductFormOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleProductSubmit}>
                <label className="space-y-1.5 text-xs text-slate-400 sm:col-span-2">
                  Название
                  <input
                    autoFocus
                    className={inputClass}
                    onChange={(event) =>
                      setProductForm({ ...productForm, title: event.target.value })
                    }
                    required
                    value={productForm.title}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-slate-400">
                  Цена ({currency})
                  <input
                    className={inputClass}
                    min="0"
                    onChange={(event) =>
                      setProductForm({ ...productForm, price: event.target.value })
                    }
                    required
                    step="0.01"
                    type="number"
                    value={productForm.price}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-slate-400">
                  Остаток
                  <input
                    className={inputClass}
                    min="0"
                    onChange={(event) =>
                      setProductForm({ ...productForm, stock: event.target.value })
                    }
                    required
                    step="1"
                    type="number"
                    value={productForm.stock}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-slate-400">
                  Категория
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        category_id: event.target.value,
                      })
                    }
                    value={productForm.category_id}
                  >
                    <option value="">Без категории</option>
                    {categories.map((category, index) => (
                      <option
                        key={
                          category.id
                            ? `admin-item-${category.id}`
                            : `admin-idx-${index}`
                        }
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs text-slate-400">
                  Единица
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      setProductForm({ ...productForm, unit: event.target.value })
                    }
                    value={productForm.unit}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-slate-400 sm:col-span-2">
                  URL изображения
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        main_image_url: event.target.value,
                      })
                    }
                    placeholder="https://..."
                    type="url"
                    value={productForm.main_image_url}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-slate-400 sm:col-span-2">
                  Описание
                  <textarea
                    className={`${inputClass} min-h-20 resize-y`}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        description: event.target.value,
                      })
                    }
                    value={productForm.description}
                  />
                </label>
                <label className="space-y-1.5 text-xs text-slate-400 sm:col-span-2">
                  Атрибуты (JSON)
                  <textarea
                    className={`${inputClass} min-h-28 resize-y font-mono text-xs`}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        attributes: event.target.value,
                      })
                    }
                    placeholder={'{"switches":"Linear Violet","backlight":"RGB"}'}
                    value={productForm.attributes}
                  />
                </label>
                {productFormError && (
                  <p className="text-sm text-red-300 sm:col-span-2" role="alert">
                    {productFormError}
                  </p>
                )}
                <div className="flex gap-3 pt-1 sm:col-span-2">
                  <button
                    className="flex-1 rounded-xl bg-cyber-purple px-4 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
                    type="submit"
                  >
                    {editingProduct ? "Сохранить изменения" : "Создать товар"}
                  </button>
                  <button
                    className="rounded-xl border border-cyber-border px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
                    onClick={() => setIsProductFormOpen(false)}
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
    </AnimatePresence>
  );
}
