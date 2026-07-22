"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  compact?: boolean;
};

export function ThemeToggle({ compact }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div className="flex rounded-xl border border-border bg-card p-1">
        <ThemeButton active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
        <ThemeButton active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark" />
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
      <div className="flex rounded-xl border border-border bg-background p-1">
        <ThemeButton active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
        <ThemeButton active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark" />
      </div>
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
