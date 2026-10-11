import axios from "axios";
import { create } from "zustand";
import { apiClient } from "../api/client";
import { useCartStore } from "./useCartStore";
import { useOrderStore } from "./useOrderStore";
import { useToastStore } from "./useToastStore";
import type { User } from "../types";

const TOKEN_KEY = "token";
const LEGACY_TOKEN_KEY = "access_token";
const USER_KEY = "user";
const LEGACY_USER_KEY = "auth_user";
const MOCK_BALANCES_KEY = "mock_balance_overrides";
const USERNAME_KEY = "saved_username";
const PASSWORD_KEY = "saved_password";
const REMEMBER_ME_KEY = "remember_me";
let profileMutationVersion = 0;

interface AuthResponse {
  access_token?: string;
  token?: string;
  user?: User;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionChecked: boolean;
  mockBalances: Record<string, number>;
  savedUsername: string;
  savedPassword: string;
  rememberMe: boolean;
  login: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
  register: (
    username: string,
    password: string,
    email: string,
  ) => Promise<void>;
  fetchMe: () => Promise<void>;
  updateAvatar: (avatarUrl: string | null) => Promise<void>;
  adjustMockBalance: (
    username: string,
    amount: number,
    direction: "credit" | "debit",
    users: User[],
  ) => boolean;
  logout: () => void;
  updateProfile: (newUsername: string, newPassword: string) => Promise<void>;
}

const readSavedCredential = (key: string) => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(key) ?? "";
};

const readRememberMe = () =>
  typeof window !== "undefined" &&
  localStorage.getItem(REMEMBER_ME_KEY) === "true";

const readCachedUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(USER_KEY) ??
        localStorage.getItem(LEGACY_USER_KEY) ??
        "null",
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      typeof parsed.id === "number" &&
      "username" in parsed &&
      typeof parsed.username === "string" &&
      "role" in parsed &&
      (parsed.role === "USER" || parsed.role === "ADMIN") &&
      "balance" in parsed &&
      typeof parsed.balance === "number"
    ) {
      return parsed as User;
    }
  } catch {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  }

  return null;
};

const readMockBalances = (): Record<string, number> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(MOCK_BALANCES_KEY) ?? "{}",
    );
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    localStorage.removeItem(MOCK_BALANCES_KEY);
    return {};
  }
};

const saveCachedUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
};

const extractUser = (data: AuthResponse | User): User | undefined => {
  if ("user" in data && data.user) {
    return data.user;
  }

  if ("id" in data && "username" in data) {
    return data;
  }

  return undefined;
};

const normalizeUsername = (username: string) => username.trim().toLocaleLowerCase();

const applyMockBalance = (
  user: User,
  mockBalances: Record<string, number>,
): User => ({
  ...user,
  balance: mockBalances[normalizeUsername(user.username)] ?? user.balance,
});

export const useAuthStore = create<AuthStore>((set, get) => ({
  user:
    typeof window !== "undefined" &&
    (localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY))
      ? readCachedUser()
      : null,
  token:
    typeof window === "undefined"
      ? null
      : localStorage.getItem(TOKEN_KEY) ??
        localStorage.getItem(LEGACY_TOKEN_KEY),
  sessionChecked: false,
  mockBalances: readMockBalances(),
  isAuthenticated:
    typeof window !== "undefined" &&
    Boolean(
      localStorage.getItem(TOKEN_KEY) ??
        localStorage.getItem(LEGACY_TOKEN_KEY),
    ),
  savedUsername: readSavedCredential(USERNAME_KEY),
  savedPassword: readSavedCredential(PASSWORD_KEY),
  rememberMe: readRememberMe(),

  login: async (username, password, remember) => {
    const response = await apiClient.post<AuthResponse | User>(
      "/api/v1/auth/login",
      { username, password },
    );
    const token =
      ("access_token" in response.data && response.data.access_token) ||
      ("token" in response.data && response.data.token);

    if (!token) {
      throw new Error("Сервер не вернул токен авторизации.");
    }

    let user = extractUser(response.data);

    if (!user) {
      const profileResponse = await apiClient.get<User>("/api/v1/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      user = profileResponse.data;
    }

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_ME_KEY, String(remember));

    if (remember) {
      localStorage.setItem(USERNAME_KEY, username);
      localStorage.setItem(PASSWORD_KEY, password);
    } else {
      localStorage.removeItem(USERNAME_KEY);
      localStorage.removeItem(PASSWORD_KEY);
    }

    if (get().user && get().user?.id !== user.id) {
      useCartStore.getState().resetSession();
      useOrderStore.getState().resetSession();
    }

    user = applyMockBalance(user, get().mockBalances);
    saveCachedUser(user);
    set({
      user,
      token,
      isAuthenticated: true,
      sessionChecked: true,
      savedUsername: remember ? username : "",
      savedPassword: remember ? password : "",
      rememberMe: remember,
    });
  },

  register: async (username, password, email) => {
    await apiClient.post("/api/v1/auth/register", {
      username,
      password,
      email,
    });
    await get().login(username, password, false);
  },

  fetchMe: async () => {
    const token =
      get().token ??
      localStorage.getItem(TOKEN_KEY) ??
      localStorage.getItem(LEGACY_TOKEN_KEY);

    if (!token) {
      useCartStore.getState().resetSession();
      useOrderStore.getState().resetSession();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        sessionChecked: true,
      });
      return;
    }

    try {
      const response = await apiClient.get<User>("/api/v1/users/me");
      if (get().user && get().user?.id !== response.data.id) {
        useCartStore.getState().resetSession();
        useOrderStore.getState().resetSession();
      }
      const user = applyMockBalance(
        response.data,
        get().mockBalances,
      );
      saveCachedUser(user);
      set({
        user,
        token,
        isAuthenticated: true,
        sessionChecked: true,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        useCartStore.getState().resetSession();
        useOrderStore.getState().resetSession();
        set({
          user: null,
          token,
          isAuthenticated: false,
          sessionChecked: true,
        });
        return;
      }

      set({ sessionChecked: true });
      throw error;
    }
  },

  updateAvatar: (avatarUrl) => {
    const previousUser = get().user;
    if (!previousUser) {
      useToastStore.getState().showToast("Войдите, чтобы изменить аватар.", "error");
      return Promise.resolve();
    }
    const version = ++profileMutationVersion;
    const optimisticUser = {
      ...previousUser,
      avatar_url: avatarUrl ?? undefined,
    };
    saveCachedUser(optimisticUser);
    set({ user: optimisticUser });

    void apiClient
      .patch<User>("/api/v1/users/me", { avatar_url: avatarUrl })
      .then((response) => {
        if (profileMutationVersion === version) {
          const updatedUser = {
            ...get().user!,
            ...response.data,
            email: get().user?.email,
          };
          saveCachedUser(updatedUser);
          set({ user: updatedUser });
        }
        useToastStore.getState().showToast("Аватар обновлён.", "success");
      })
      .catch(() => {
        if (profileMutationVersion === version) {
          saveCachedUser(previousUser);
          set({ user: previousUser });
        }
        useToastStore
          .getState()
          .showToast("Не удалось сохранить аватар. Изменения отменены.", "error");
      });
    return Promise.resolve();
  },

  adjustMockBalance: (username, amount, direction, users) => {
    const currentUser = get().user;
    const normalizedUsername = normalizeUsername(username);
    if (currentUser?.role !== "ADMIN") {
      useToastStore.getState().showToast("Недостаточно прав.", "error");
      return false;
    }
    if (!normalizedUsername || !Number.isFinite(amount) || amount <= 0) {
      useToastStore
        .getState()
        .showToast("Укажите логин и положительную сумму.", "error");
      return false;
    }

    const targetUser = users.find(
      (candidate) => normalizeUsername(candidate.username) === normalizedUsername,
    );
    if (!targetUser) {
      useToastStore.getState().showToast("Пользователь не найден.", "error");
      return false;
    }

    const previousBalances = get().mockBalances;
    const isCurrentUser =
      normalizeUsername(currentUser.username) === normalizedUsername;
    const previousBalance = isCurrentUser
      ? currentUser.balance
      : previousBalances[normalizedUsername] ?? targetUser.balance;
    const newBalance =
      previousBalance + (direction === "credit" ? amount : -amount);
    if (newBalance < 0) {
      useToastStore
        .getState()
        .showToast("Нельзя списать больше текущего баланса.", "error");
      return false;
    }

    const nextBalances = {
      ...previousBalances,
      [normalizedUsername]: newBalance,
    };
    localStorage.setItem(MOCK_BALANCES_KEY, JSON.stringify(nextBalances));
    const updatedCurrentUser = isCurrentUser
      ? { ...currentUser, balance: newBalance }
      : null;
    if (updatedCurrentUser) {
      saveCachedUser(updatedCurrentUser);
    }
    set({
      mockBalances: nextBalances,
      ...(isCurrentUser
        ? { user: updatedCurrentUser }
        : {}),
    });
    const formattedBalance = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(newBalance);
    const escapedUsername = targetUser.username.replace(/'/g, "''");
    const sqlOperator = direction === "credit" ? "+" : "-";
    const sqlQuery =
      `UPDATE users SET balance = balance ${sqlOperator} ${amount} ` +
      `WHERE username = '${escapedUsername}';`;
    console.info("SQL для ручного выполнения в Supabase SQL Editor:", sqlQuery);
    useToastStore
      .getState()
      .showToast(
        `Локальная симуляция: баланс ${targetUser.username} — ${formattedBalance}. БД не изменена. SQL для ручного выполнения: ${sqlQuery}`,
        "success",
      );
    return true;
  },

  logout: () => {
    useCartStore.getState().resetSession();
    useOrderStore.getState().resetSession();
    localStorage.clear();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionChecked: true,
      mockBalances: {},
      savedUsername: "",
      savedPassword: "",
      rememberMe: false,
    });
  },

  updateProfile: (newUsername, newPassword) => {
    const previousUser = get().user;
    if (!previousUser) {
      useToastStore
        .getState()
        .showToast("Войдите, чтобы изменить профиль.", "error");
      return Promise.resolve();
    }

    const version = ++profileMutationVersion;
    const optimisticUser = { ...previousUser, username: newUsername };
    saveCachedUser(optimisticUser);
    set({ user: optimisticUser });
    const previousSavedUsername = localStorage.getItem(USERNAME_KEY);
    const previousSavedPassword = localStorage.getItem(PASSWORD_KEY);
    if (get().rememberMe) {
      localStorage.setItem(USERNAME_KEY, newUsername);
      if (newPassword) {
        localStorage.setItem(PASSWORD_KEY, newPassword);
      }
      set({
        savedUsername: newUsername,
        savedPassword: newPassword || get().savedPassword,
      });
    }

    void apiClient
      .patch<User>("/api/v1/users/me", {
        username: newUsername,
        ...(newPassword ? { password: newPassword } : {}),
      })
      .then((response) => {
        if (profileMutationVersion !== version) {
          return;
        }
        const updatedUser = {
          ...optimisticUser,
          ...response.data,
          email: previousUser.email,
        };
        saveCachedUser(updatedUser);
        set({ user: updatedUser });
        if (get().rememberMe) {
          localStorage.setItem(USERNAME_KEY, newUsername);
          if (newPassword) {
            localStorage.setItem(PASSWORD_KEY, newPassword);
          }
          set({
            savedUsername: newUsername,
            savedPassword: newPassword || get().savedPassword,
          });
        }
        useToastStore
          .getState()
          .showToast("Профиль обновлён.", "success");
      })
      .catch(() => {
        if (profileMutationVersion === version) {
          saveCachedUser(previousUser);
          set({ user: previousUser });
          if (get().rememberMe) {
            if (previousSavedUsername === null) {
              localStorage.removeItem(USERNAME_KEY);
            } else {
              localStorage.setItem(USERNAME_KEY, previousSavedUsername);
            }
            if (previousSavedPassword === null) {
              localStorage.removeItem(PASSWORD_KEY);
            } else {
              localStorage.setItem(PASSWORD_KEY, previousSavedPassword);
            }
            set({
              savedUsername: previousSavedUsername ?? "",
              savedPassword: previousSavedPassword ?? "",
            });
          }
        }
        useToastStore
          .getState()
          .showToast(
            "Сервер не поддержал смену логина или пароля. Изменения отменены.",
            "error",
          );
      });

    return Promise.resolve();
  },
}));
