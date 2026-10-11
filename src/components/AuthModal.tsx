import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useToastStore } from "../store/useToastStore";

type AuthMode = "login" | "register";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    login,
    register,
    savedUsername,
    savedPassword,
    rememberMe: savedRememberMe,
  } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRemember(savedRememberMe);
      setError("");
    }
  }, [isOpen, savedPassword, savedRememberMe, savedUsername]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && otp.trim() !== "8888") {
      setError("Введите код подтверждения 8888.");
      return;
    }

    const request =
      mode === "login"
        ? login(username, password, remember)
        : register(username, password, email);
    const actionLabel =
      mode === "login" ? "Вход выполнен." : "Регистрация завершена.";

    onClose();
    useToastStore.getState().showToast("Проверяем данные...", "info");

    void request
      .then(() => {
        useToastStore.getState().showToast(actionLabel, "success");
      })
      .catch((error: unknown) => {
        const responseData: unknown = axios.isAxiosError(error)
          ? error.response?.data
          : undefined;
        const serverMessage =
          typeof responseData === "object" &&
          responseData !== null &&
          "detail" in responseData &&
          typeof responseData.detail === "string"
            ? responseData.detail
            : undefined;
        useToastStore
          .getState()
          .showToast(
            serverMessage ??
              (mode === "login"
                ? "Не удалось войти. Проверьте логин и пароль."
                : "Не удалось завершить регистрацию. Проверьте данные."),
            "error",
          );
        window.dispatchEvent(new Event("cybertech:auth-required"));
      });
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[#1E2638] bg-[#131722]/90 p-6 shadow-[0_0_60px_rgba(6,182,212,0.12)] backdrop-blur-md sm:p-8"
        role="dialog"
      >
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyber-cyan">
              CyberTech access
            </p>
            <h2
              className="text-2xl font-bold text-white"
              id="auth-modal-title"
            >
              {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
            </h2>
          </div>
          <button
            aria-label="Закрыть окно"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-[#1E2638] bg-[#0b0d12] p-1">
          <button
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-cyber-cyan/15 text-cyber-cyan"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => switchMode("login")}
            type="button"
          >
            Вход
          </button>
          <button
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mode === "register"
                ? "bg-cyber-purple/15 text-cyber-purple"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => switchMode("register")}
            type="button"
          >
            Регистрация
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm text-slate-300">
            <span>Логин</span>
            <input
              autoComplete="username"
              className="w-full rounded-xl border border-[#1E2638] bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyber-cyan"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Ваш логин"
              required
              value={username}
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-300">
            <span>Пароль</span>
            <input
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="w-full rounded-xl border border-[#1E2638] bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyber-cyan"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ваш пароль"
              required
              type="password"
              value={password}
            />
          </label>

          {mode === "login" ? (
            <label className="flex cursor-pointer items-center gap-3 py-1 text-sm text-slate-400">
              <input
                checked={remember}
                className="h-4 w-4 accent-cyber-cyan"
                onChange={(event) => setRemember(event.target.checked)}
                type="checkbox"
              />
              Запомнить меня
            </label>
          ) : (
            <>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Email</span>
                <input
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#1E2638] bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyber-cyan"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <div className="rounded-xl border border-cyber-amber/25 bg-cyber-amber/5 p-3 text-sm">
                <p className="font-mono text-cyber-amber">
                  [СИСТЕМА]: Код подтверждения: 8888
                </p>
                <label className="mt-3 block space-y-2 text-slate-300">
                  <span>Код подтверждения</span>
                  <input
                    autoComplete="one-time-code"
                    className="w-full rounded-lg border border-[#1E2638] bg-[#0b0d12]/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyber-amber"
                    inputMode="numeric"
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Введите 8888"
                    required
                    value={otp}
                  />
                </label>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-xl bg-cyber-cyan px-4 py-3 font-bold text-[#071015] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            type="submit"
          >
            {mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
      </section>
    </div>
  );
}
