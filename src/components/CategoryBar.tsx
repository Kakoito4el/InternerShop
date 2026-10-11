import { Search, X } from "lucide-react";
import { useProductStore } from "../store/useProductStore";
import type { Category } from "../types";

type NeonTheme = "purple" | "emerald" | "cyan" | "amber";

const themeClasses: Record<NeonTheme, { active: string; dot: string }> = {
  purple: {
    active: "border-cyber-purple/70 bg-cyber-purple/10 text-cyber-purple shadow-[0_0_24px_rgba(168,85,247,0.2)]",
    dot: "bg-cyber-purple",
  },
  emerald: {
    active: "border-cyber-emerald/70 bg-cyber-emerald/10 text-cyber-emerald shadow-[0_0_24px_rgba(16,185,129,0.2)]",
    dot: "bg-cyber-emerald",
  },
  cyan: {
    active: "border-cyber-cyan/70 bg-cyber-cyan/10 text-cyber-cyan shadow-[0_0_24px_rgba(6,182,212,0.2)]",
    dot: "bg-cyber-cyan",
  },
  amber: {
    active: "border-cyber-amber/70 bg-cyber-amber/10 text-cyber-amber shadow-[0_0_24px_rgba(245,158,11,0.2)]",
    dot: "bg-cyber-amber",
  },
};

const getCategoryTheme = (category: Category): NeonTheme => {
  const name = `${category.name} ${category.slug}`.toLocaleLowerCase("ru");

  if (/клавиат|свитч|keyboard|switch/.test(name)) {
    return "purple";
  }
  if (/комплект|компьютер|пк|pc|component/.test(name)) {
    return "emerald";
  }
  if (/монитор|экран|monitor|screen|display/.test(name)) {
    return "cyan";
  }
  if (/аудио|звук|мыш|науш|audio|mouse|headphone/.test(name)) {
    return "amber";
  }

  return "cyan";
};

interface CategoryButtonProps {
  label: string;
  active: boolean;
  theme: NeonTheme;
  themeColor?: string;
  onClick: () => void;
}

function CategoryButton({
  label,
  active,
  theme,
  themeColor,
  onClick,
}: CategoryButtonProps) {
  const colors = themeClasses[theme];

  return (
    <button
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? colors.active
          : "border-cyber-border bg-bg-card text-slate-400 hover:border-slate-500 hover:text-white"
      }`}
      onClick={onClick}
      style={
        active && themeColor
          ? {
              borderColor: themeColor,
              backgroundColor: `${themeColor}18`,
              color: themeColor,
              boxShadow: `0 0 24px ${themeColor}33`,
            }
          : undefined
      }
      type="button"
    >
      {active && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${themeColor ? "" : colors.dot}`}
          style={themeColor ? { backgroundColor: themeColor } : undefined}
        />
      )}
      {label}
    </button>
  );
}

export function CategoryBar() {
  const {
    categories,
    categoryThemes,
    selectedCategoryId,
    sortBy,
    searchQuery,
    setCategory,
    setSortBy,
    setSearchQuery,
  } = useProductStore();

  return (
    <section aria-label="Фильтры каталога" className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {categories.map((category, index) => (
          <CategoryButton
            active={selectedCategoryId === category.id}
            key={`${category.id ?? "category"}-${index}`}
            label={category.name}
            onClick={() => setCategory(category.id)}
            theme={getCategoryTheme(category)}
            themeColor={categoryThemes[category.slug]}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block max-w-xl flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            aria-label="Поиск в категории"
            className="w-full rounded-xl border border-cyber-border bg-bg-card py-3 pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyber-cyan/60"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск в категории..."
            value={searchQuery}
          />
          {searchQuery && (
            <button
              aria-label="Очистить поиск в категории"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              <X size={17} />
            </button>
          )}
        </label>
        <label className="flex shrink-0 items-center gap-2 text-sm text-slate-400">
          Сортировка
          <select
            aria-label="Сортировка товаров"
            className="rounded-xl border border-cyber-border bg-bg-card px-3 py-3 text-sm text-white outline-none transition focus:border-cyber-cyan/60"
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "price-asc"
                  | "price-desc"
                  | "name-asc"
                  | "name-desc"
                  | "stock",
              )
            }
            value={sortBy}
          >
            <option value="price-asc">Сначала дешевле</option>
            <option value="price-desc">Сначала дороже</option>
            <option value="name-asc">Название: А–Я</option>
            <option value="name-desc">Название: Я–А</option>
            <option value="stock">Сначала в наличии</option>
          </select>
        </label>
      </div>
    </section>
  );
}
