import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useToastStore } from "../store/useToastStore";

const toneClasses = {
  success: "border-cyber-emerald/30 text-cyber-emerald",
  error: "border-red-400/30 text-red-300",
  info: "border-cyber-cyan/30 text-cyber-cyan",
  warning: "border-cyber-amber/30 text-cyber-amber",
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: TriangleAlert,
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[150] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast, index) => {
          const Icon = icons[toast.kind];

          return (
            <motion.div
              animate={{ opacity: 1, x: 0, y: 0 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#131722]/95 px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${toneClasses[toast.kind]}`}
              exit={{ opacity: 0, x: 20 }}
              initial={{ opacity: 0, x: 20, y: 8 }}
              key={
                toast.id
                  ? `admin-item-${toast.id}`
                  : `admin-idx-${index}`
              }
              role={toast.kind === "error" ? "alert" : "status"}
            >
              <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
              <p className="flex-1 text-slate-200">{toast.message}</p>
              <button
                aria-label="Закрыть уведомление"
                className="shrink-0 text-slate-500 transition hover:text-white"
                onClick={() => dismissToast(toast.id)}
                type="button"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
