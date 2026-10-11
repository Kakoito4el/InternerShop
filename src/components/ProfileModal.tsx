import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut,
  Palette,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTab = "overview" | "appearance" | "security";
type SiteTheme = "dark-cyberpunk" | "matrix-green" | "light-neon";

const avatarPresets = [
  { id: "cyan", label: "Неоновый циан", background: "#083344", accent: "#22d3ee" },
  { id: "purple", label: "Неоновый фиолетовый", background: "#2e1065", accent: "#c084fc" },
  { id: "emerald", label: "Неоновый изумруд", background: "#022c22", accent: "#34d399" },
  { id: "amber", label: "Неоновый янтарный", background: "#451a03", accent: "#fbbf24" },
  { id: "rose", label: "Неоновый розовый", background: "#4c0519", accent: "#fb7185" },
];

const themes: Array<{
  id: SiteTheme;
  name: string;
  description: string;
  accent: string;
}> = [
  {
    id: "dark-cyberpunk",
    name: "Dark Cyberpunk",
    description: "Углеродный фон и холодное неоновое свечение",
    accent: "#06B6D4",
  },
  {
    id: "matrix-green",
    name: "Matrix Green",
    description: "Тёмная матрица с ярким зелёным акцентом",
    accent: "#22C55E",
  },
  {
    id: "light-neon",
    name: "Light Neon",
    description: "Светлая поверхность с контрастным циановым свечением",
    accent: "#0891B2",
  },
];

const makeAvatar = (background: string, accent: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${background}"/><circle cx="48" cy="35" r="17" fill="${accent}"/><path d="M16 86c2-20 14-31 32-31s30 11 32 31" fill="${accent}"/><path d="M32 33c2-13 10-21 23-21 8 0 15 4 19 11-7-3-14-4-21-2-7 2-13 6-21 12" fill="#0b0d12" opacity=".75"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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

const applyTheme = (theme: SiteTheme) => {
  const definition = themes.find((item) => item.id === theme) ?? themes[0];
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty("--accent-color", definition.accent);
  localStorage.setItem("cybertech_theme", theme);
};

const getSavedTheme = (): SiteTheme => {
  const saved = localStorage.getItem("cybertech_theme");
  return themes.some((theme) => theme.id === saved)
    ? (saved as SiteTheme)
    : "dark-cyberpunk";
};

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const user = useAuthStore((state) => state.user);
  const updateAvatar = useAuthStore((state) => state.updateAvatar);
  const currency = useAppStore((state) => state.settings.currency);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState<SiteTheme>(getSavedTheme);
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

  useEffect(() => {
    if (isOpen && user) {
      setSelectedAvatar(user.avatar_url ?? "");
      setUsername(user.username);
      setPassword("");
      setError("");
      setTheme(getSavedTheme());
    }
  }, [isOpen, user]);

  const handleAvatarSave = () => {
    if (selectedAvatar === (user?.avatar_url ?? "")) {
      return;
    }
    void updateAvatar(selectedAvatar || null);
    onClose();
  };

  const handleCredentialsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      setError("Логин не может быть пустым.");
      return;
    }
    void useAuthStore.getState().updateProfile(username.trim(), password);
    onClose();
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    window.location.reload();
  };

  const sidebarButton = (
    tab: ProfileTab,
    label: string,
    icon: typeof UserRound,
  ) => {
    const Icon = icon;
    return (
      <button
        aria-current={activeTab === tab ? "page" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
          activeTab === tab
            ? "border border-cyber-cyan/25 bg-cyber-cyan/10 text-cyber-cyan"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
        onClick={() => setActiveTab(tab)}
        type="button"
      >
        <Icon aria-hidden="true" size={17} />
        {label}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="profile-modal-overlay"
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
            aria-labelledby="profile-modal-title"
            aria-modal="true"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-[101] my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#1E2638] bg-[#131722] text-white shadow-2xl md:min-h-[620px] md:flex-row"
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <aside className="flex w-full shrink-0 flex-col border-b border-cyber-border bg-[#0b0d12]/65 p-4 md:w-64 md:border-b-0 md:border-r md:p-5">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyber-cyan/30 bg-bg-card text-cyber-cyan">
                  {user?.avatar_url ? (
                    <img alt="" className="h-full w-full object-cover" src={user.avatar_url} />
                  ) : (
                    <UserRound aria-hidden="true" size={21} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {user?.username ?? "Пользователь"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-cyber-cyan">
                    {user?.role ?? "USER"}
                  </p>
                </div>
                <button
                  aria-label="Закрыть профиль"
                  className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white md:hidden"
                  onClick={onClose}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              <nav aria-label="Разделы профиля" className="mt-5 grid grid-cols-1 gap-1 sm:grid-cols-3 md:grid-cols-1">
                {sidebarButton("overview", "Обзор профиля", UserRound)}
                {sidebarButton("appearance", "Настройки внешнего вида", Palette)}
                {sidebarButton("security", "Безопасность", ShieldCheck)}
              </nav>

              <button
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/5 px-3 py-3 text-sm font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-500/10 md:mt-auto"
                onClick={handleLogout}
                type="button"
              >
                <LogOut aria-hidden="true" size={17} />
                Выйти из аккаунта
              </button>
            </aside>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
              <header className="mb-7 hidden items-start justify-between md:flex">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyber-cyan">
                    Личный кабинет
                  </p>
                  <h2 className="mt-2 text-2xl font-bold" id="profile-modal-title">
                    {activeTab === "overview"
                      ? "Обзор профиля"
                      : activeTab === "appearance"
                        ? "Настройки внешнего вида"
                        : "Безопасность"}
                  </h2>
                </div>
                <button
                  aria-label="Закрыть профиль"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  <X size={20} />
                </button>
              </header>

              {activeTab === "overview" && (
                <section aria-label="Обзор профиля">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-cyber-border bg-[#0b0d12]/60 p-4">
                      <p className="text-xs text-slate-500">Логин</p>
                      <p className="mt-1 truncate font-semibold">{user?.username ?? "—"}</p>
                    </div>
                    <div className="rounded-xl border border-cyber-border bg-[#0b0d12]/60 p-4">
                      <p className="text-xs text-slate-500">Роль</p>
                      <p className="mt-1 flex items-center gap-2 font-semibold">
                        {user?.role === "ADMIN" && <ShieldCheck size={15} />}
                        {user?.role ?? "USER"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyber-border bg-[#0b0d12]/60 p-4">
                      <p className="text-xs text-slate-500">Почта</p>
                      <p className="mt-1 break-all font-semibold">{user?.email ?? "Не указана"}</p>
                    </div>
                    <div className="rounded-xl border border-cyber-emerald/20 bg-cyber-emerald/5 p-4">
                      <p className="text-xs text-slate-500">Баланс</p>
                      <p className="mt-1 font-bold text-cyber-emerald">
                        {formatMoney(user?.balance ?? 0, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 rounded-xl border border-cyber-border bg-[#0b0d12]/40 p-5">
                    <h3 className="font-bold">Аватар профиля</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Выберите визуальный идентификатор для аккаунта.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {avatarPresets.map((preset, index) => {
                        const avatarUrl = makeAvatar(preset.background, preset.accent);
                        return (
                          <button
                            aria-label={preset.label}
                            aria-pressed={selectedAvatar === avatarUrl}
                            className={`h-14 w-14 overflow-hidden rounded-full border-2 transition ${
                              selectedAvatar === avatarUrl
                                ? "border-cyber-cyan shadow-[0_0_18px_rgba(6,182,212,0.4)]"
                                : "border-cyber-border hover:border-slate-500"
                            }`}
                            key={`${preset.id}-${index}`}
                            onClick={() => setSelectedAvatar(avatarUrl)}
                            type="button"
                          >
                            <img alt="" className="h-full w-full" src={avatarUrl} />
                          </button>
                        );
                      })}
                      <button
                        aria-label="Убрать аватар"
                        aria-pressed={!selectedAvatar}
                        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyber-border text-slate-400 hover:border-cyber-cyan hover:text-cyber-cyan"
                        onClick={() => setSelectedAvatar("")}
                        type="button"
                      >
                        <UserRound size={21} />
                      </button>
                    </div>
                    <button
                      className="mt-4 rounded-lg border border-cyber-cyan/30 px-4 py-2 text-sm font-semibold text-cyber-cyan transition hover:bg-cyber-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={selectedAvatar === (user?.avatar_url ?? "")}
                      onClick={handleAvatarSave}
                      type="button"
                    >
                      Сохранить аватар
                    </button>
                  </div>
                </section>
              )}

              {activeTab === "appearance" && (
                <section aria-label="Настройки внешнего вида">
                  <p className="text-sm text-slate-400">
                    Выберите цветовую схему. Акцент интерфейса применится сразу.
                  </p>
                  <div className="mt-5 space-y-3">
                    {themes.map((item, index) => (
                      <button
                        aria-pressed={theme === item.id}
                        className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                          theme === item.id
                            ? "border-cyber-cyan/50 bg-cyber-cyan/5"
                            : "border-cyber-border bg-[#0b0d12]/50 hover:border-slate-600"
                        }`}
                        key={`${item.id}-${index}`}
                        onClick={() => {
                          setTheme(item.id);
                          applyTheme(item.id);
                        }}
                        type="button"
                      >
                        <span
                          className="h-10 w-10 shrink-0 rounded-full border border-white/10"
                          style={{
                            background: `radial-gradient(circle at 35% 35%, ${item.accent}, #131722 72%)`,
                            boxShadow: `0 0 18px ${item.accent}55`,
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-white">{item.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {item.description}
                          </span>
                        </span>
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.accent }}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="mt-5 text-xs text-slate-500">
                    Акцент: <code>--accent-color</code>
                  </p>
                </section>
              )}

              {activeTab === "security" && (
                <section aria-label="Безопасность аккаунта">
                  <div className="mb-5 rounded-xl border border-cyber-amber/20 bg-cyber-amber/5 p-4 text-sm text-slate-300">
                    API бэкенда сейчас не поддерживает смену логина или пароля.
                    Изменения будут отклонены сервером.
                  </div>
                  <form
                    className="space-y-4 rounded-xl border border-cyber-border bg-[#0b0d12]/40 p-5"
                    onSubmit={handleCredentialsSubmit}
                  >
                    <h3 className="font-bold">Учётные данные</h3>
                    <label className="block space-y-2 text-xs text-slate-400">
                      Логин
                      <input
                        autoComplete="username"
                        className="w-full rounded-lg border border-cyber-border bg-[#0b0d12]/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyber-cyan"
                        onChange={(event) => setUsername(event.target.value)}
                        value={username}
                      />
                    </label>
                    <label className="block space-y-2 text-xs text-slate-400">
                      Новый пароль
                      <input
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-cyber-border bg-[#0b0d12]/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyber-cyan"
                        onChange={(event) => setPassword(event.target.value)}
                        type="password"
                        value={password}
                      />
                    </label>
                    {error && (
                      <p className="text-sm text-red-300" role="alert">{error}</p>
                    )}
                    <button
                      className="rounded-lg border border-cyber-border px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
                      type="submit"
                    >
                      Сохранить данные
                    </button>
                  </form>
                </section>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
