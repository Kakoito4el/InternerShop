import { create } from "zustand";
import axios from "axios";
import { apiClient } from "../api/client";
import { useAuthStore } from "./useAuthStore";
import { useToastStore } from "./useToastStore";
import type { Category, Product } from "../types";

interface ProductStore {
  categories: Category[];
  products: Product[];
  categoryThemes: Record<string, string>;
  selectedCategoryId: number | null;
  sortBy: "price-asc" | "price-desc" | "name-asc" | "name-desc" | "stock";
  searchQuery: string;
  selectedProduct: Product | null;
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  catalogError: string | null;
  fetchCategories: () => Promise<void>;
  fetchProducts: (categoryId?: number) => Promise<void>;
  setCategory: (id: number) => void;
  setSortBy: (sortBy: ProductStore["sortBy"]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  updateProduct: (
    productId: number,
    updates: Pick<Product, "price" | "stock">,
  ) => Promise<void>;
  createProduct: (product: Omit<Product, "id" | "app_id">) => Promise<void>;
  saveProduct: (
    productId: number,
    updates: Partial<Omit<Product, "id" | "app_id">>,
  ) => Promise<void>;
  deleteProduct: (productId: number) => Promise<void>;
  createCategory: (
    category: Pick<Category, "name" | "slug"> & { themeColor: string },
  ) => Promise<void>;
}

let latestProductRequestId = 0;
const productEditTimers = new Map<number, number>();
const productEditVersions = new Map<number, number>();
const pendingProductSnapshots = new Map<number, Product>();
const PRODUCT_EDIT_DEBOUNCE_MS = 400;
let nextTemporaryProductId = -1;
let nextTemporaryCategoryId = -1;
const PRODUCT_PAGE_LIMIT = 100;
const productSaveVersions = new Map<number, number>();
const productSaveSnapshots = new Map<number, Product>();

const readCategoryThemes = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem("cybertech_category_themes");
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([key, value]) =>
            typeof key === "string" &&
            typeof value === "string" &&
            /^#[\da-f]{6}$/i.test(value),
        ),
      );
    }
  } catch (error) {
    console.warn("Не удалось прочитать цветовые темы категорий.", error);
  }
  return {};
};

const persistCategoryThemes = (themes: Record<string, string>) => {
  try {
    localStorage.setItem("cybertech_category_themes", JSON.stringify(themes));
  } catch (error) {
    console.warn("Не удалось сохранить цветовые темы категорий.", error);
  }
};

export const useProductStore = create<ProductStore>((set, get) => ({
  categories: [],
  products: [],
  categoryThemes: readCategoryThemes(),
  selectedCategoryId: null,
  sortBy: "price-asc",
  searchQuery: "",
  selectedProduct: null,
  isLoadingCategories: false,
  isLoadingProducts: false,
  catalogError: null,

  fetchCategories: async () => {
    set({ isLoadingCategories: true, catalogError: null });

    try {
      const response = await apiClient.get<Category[]>("/api/v1/categories/");
      const categories = response.data.filter((category) => category.is_active);
      set((state) => ({
        categories,
        selectedCategoryId:
          state.selectedCategoryId ??
          categories[0]?.id ??
          null,
        isLoadingCategories: false,
      }));
    } catch (error) {
      set({
        isLoadingCategories: false,
        catalogError: "Не удалось загрузить категории.",
      });
      useToastStore
        .getState()
        .showToast("Не удалось загрузить категории.", "error");
      throw error;
    }
  },

  fetchProducts: async (categoryId) => {
    const requestId = ++latestProductRequestId;
    set({ isLoadingProducts: true, catalogError: null });

    try {
      const response = await apiClient.get<Product[]>("/api/v1/products/", {
        params:
          categoryId === undefined
            ? { limit: PRODUCT_PAGE_LIMIT, offset: 0 }
            : { category_id: categoryId, limit: PRODUCT_PAGE_LIMIT, offset: 0 },
      });
      if (requestId === latestProductRequestId) {
        set({ products: response.data, isLoadingProducts: false });
      }
    } catch (error) {
      if (requestId === latestProductRequestId) {
        set({
          isLoadingProducts: false,
          catalogError: "Не удалось загрузить товары.",
        });
        useToastStore
          .getState()
          .showToast("Не удалось загрузить товары.", "error");
      }
      throw error;
    }
  },

  setCategory: (id) => {
    set({ selectedCategoryId: id });
  },

  setSortBy: (sortBy) => set({ sortBy }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedProduct: (product) => set({ selectedProduct: product }),

  updateProduct: async (productId, updates) => {
    const product = get().products.find((item) => item.id === productId);
    if (!product) {
      useToastStore
        .getState()
        .showToast("Товар не найден в текущем каталоге.", "error");
      return;
    }

    if (!pendingProductSnapshots.has(productId)) {
      pendingProductSnapshots.set(productId, product);
    }
    const snapshot = pendingProductSnapshots.get(productId)!;
    const optimisticProduct = {
      ...product,
      ...updates,
      is_available: updates.stock > 0 && product.is_available,
    };
    const version = (productEditVersions.get(productId) ?? 0) + 1;
    productEditVersions.set(productId, version);
    set((state) => ({
      products: state.products.map((item) =>
        item.id === productId ? optimisticProduct : item,
      ),
      selectedProduct:
        state.selectedProduct?.id === productId
          ? optimisticProduct
          : state.selectedProduct,
    }));

    const existingTimer = productEditTimers.get(productId);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(async () => {
      productEditTimers.delete(productId);
      const latestProduct = get().products.find(
        (item) => item.id === productId,
      );
      if (!latestProduct) {
        pendingProductSnapshots.delete(productId);
        return;
      }

      try {
        const response = await apiClient.put<Product>(
          `/api/v1/products/${productId}`,
          {
            title: latestProduct.title,
            category_id: latestProduct.category_id,
            description: latestProduct.description,
            price: latestProduct.price,
            unit: latestProduct.unit,
            stock: latestProduct.stock,
            attributes: latestProduct.attributes,
            main_image_url: latestProduct.main_image_url,
            is_available: latestProduct.is_available,
          },
        );

        if (productEditVersions.get(productId) !== version) {
          return;
        }
        pendingProductSnapshots.delete(productId);
        productEditVersions.delete(productId);
        set((state) => ({
          products: state.products.map((item) =>
            item.id === productId ? response.data : item,
          ),
          selectedProduct:
            state.selectedProduct?.id === productId
              ? response.data
              : state.selectedProduct,
        }));
      } catch {
        if (productEditVersions.get(productId) === version) {
          const previousProduct = pendingProductSnapshots.get(productId) ?? snapshot;
          pendingProductSnapshots.delete(productId);
          productEditVersions.delete(productId);
          set((state) => ({
            products: state.products.map((item) =>
              item.id === productId ? previousProduct : item,
            ),
            selectedProduct:
              state.selectedProduct?.id === productId
                ? previousProduct
                : state.selectedProduct,
          }));
        }
        useToastStore
          .getState()
          .showToast(
            "Не удалось сохранить цену или остаток. Изменения отменены.",
            "error",
          );
      }
    }, PRODUCT_EDIT_DEBOUNCE_MS);

    productEditTimers.set(productId, timer);
  },

  createProduct: async (product) => {
    const temporaryId = nextTemporaryProductId--;
    const optimisticProduct: Product = {
      ...product,
      id: temporaryId,
      app_id: import.meta.env.VITE_APP_ID || "cyber-tech",
    };
    set((state) => ({ products: [optimisticProduct, ...state.products] }));

    try {
      const response = await apiClient.post<Product>("/api/v1/products/", product);
      set((state) => ({
        products: state.products.map((item) =>
          item.id === temporaryId ? response.data : item,
        ),
      }));
      useToastStore.getState().showToast("Товар создан.", "success");
    } catch (error) {
      set((state) => ({
        products: state.products.filter((item) => item.id !== temporaryId),
      }));
      useToastStore
        .getState()
        .showToast("Не удалось создать товар. Изменения отменены.", "error");
      throw error;
    }
  },

  saveProduct: async (productId, updates) => {
    const currentProduct = get().products.find((item) => item.id === productId);
    if (!currentProduct) {
      useToastStore.getState().showToast("Товар не найден.", "error");
      return;
    }

    if (!productSaveSnapshots.has(productId)) {
      productSaveSnapshots.set(productId, currentProduct);
    }
    const previousProduct = productSaveSnapshots.get(productId)!;
    const version = (productSaveVersions.get(productId) ?? 0) + 1;
    productSaveVersions.set(productId, version);
    const optimisticProduct: Product = {
      ...currentProduct,
      ...updates,
      is_available:
        updates.is_available ??
        (updates.stock !== undefined
          ? updates.stock > 0
          : currentProduct.is_available),
    };
    set((state) => ({
      products: state.products.map((item) =>
        item.id === productId ? optimisticProduct : item,
      ),
      selectedProduct:
        state.selectedProduct?.id === productId
          ? optimisticProduct
          : state.selectedProduct,
    }));

    try {
      const response = await apiClient.put<Product>(
        `/api/v1/products/${productId}`,
        updates,
      );
      if (productSaveVersions.get(productId) !== version) {
        return;
      }
      productSaveVersions.delete(productId);
      productSaveSnapshots.delete(productId);
      set((state) => ({
        products: state.products.map((item) =>
          item.id === productId ? response.data : item,
        ),
        selectedProduct:
          state.selectedProduct?.id === productId
            ? response.data
            : state.selectedProduct,
      }));
      useToastStore.getState().showToast("Изменения товара сохранены.", "success");
    } catch (error) {
      if (productSaveVersions.get(productId) === version) {
        productSaveVersions.delete(productId);
        productSaveSnapshots.delete(productId);
        set((state) => ({
          products: state.products.map((item) =>
            item.id === productId ? previousProduct : item,
          ),
          selectedProduct:
            state.selectedProduct?.id === productId
              ? previousProduct
              : state.selectedProduct,
        }));
      }
      useToastStore
        .getState()
        .showToast("Не удалось сохранить товар. Изменения отменены.", "error");
      throw error;
    }
  },

  deleteProduct: async (productId) => {
    const previousProducts = get().products;
    const previousSelectedProduct = get().selectedProduct;
    const previousIndex = previousProducts.findIndex(
      (item) => item.id === productId,
    );
    if (previousIndex < 0) {
      return;
    }
    const [removedProduct] = previousProducts.slice(previousIndex, previousIndex + 1);
    set((state) => ({
      products: state.products.filter((item) => item.id !== productId),
      selectedProduct:
        state.selectedProduct?.id === productId ? null : state.selectedProduct,
    }));

    try {
      await apiClient.delete(`/api/v1/products/${productId}`);
      useToastStore.getState().showToast("Товар удалён.", "success");
    } catch (error) {
      set((state) => {
        const products = [...state.products];
        if (!products.some((product) => product.id === productId)) {
          products.splice(
            Math.min(previousIndex, products.length),
            0,
            removedProduct,
          );
        }
        return {
          products,
          selectedProduct:
            previousSelectedProduct?.id === productId
              ? previousSelectedProduct
              : state.selectedProduct,
        };
      });
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        void useAuthStore
          .getState()
          .fetchMe()
          .catch((sessionError: unknown) => {
            console.error(
              "Не удалось обновить сессию после отказа в удалении товара.",
              sessionError,
            );
          });
      }
      useToastStore
        .getState()
        .showToast("Не удалось удалить товар. Изменения отменены.", "error");
      throw error;
    }
  },

  createCategory: async ({ name, slug, themeColor }) => {
    const temporaryId = nextTemporaryCategoryId--;
    const previousTheme = get().categoryThemes[slug];
    const optimisticCategory: Category = {
      id: temporaryId,
      app_id: import.meta.env.VITE_APP_ID || "cyber-tech",
      name,
      slug,
      is_active: true,
    };
    const nextThemes = { ...get().categoryThemes, [slug]: themeColor };
    set((state) => ({
      categories: [...state.categories, optimisticCategory],
      categoryThemes: nextThemes,
    }));
    persistCategoryThemes(nextThemes);

    try {
      const response = await apiClient.post<Category>("/api/v1/categories/", {
        name,
        slug,
        is_active: true,
      });
      set((state) => ({
        categories: state.categories.map((category) =>
          category.id === temporaryId ? response.data : category,
        ),
      }));
      useToastStore.getState().showToast("Категория создана.", "success");
    } catch (error) {
      set((state) => ({
        categories: state.categories.filter(
          (category) => category.id !== temporaryId,
        ),
        categoryThemes: previousTheme
          ? { ...state.categoryThemes, [slug]: previousTheme }
          : Object.fromEntries(
              Object.entries(state.categoryThemes).filter(
                ([categorySlug]) => categorySlug !== slug,
              ),
            ),
      }));
      const themes = get().categoryThemes;
      persistCategoryThemes(themes);
      useToastStore
        .getState()
        .showToast("Не удалось создать категорию. Изменения отменены.", "error");
      throw error;
    }
  },
}));
