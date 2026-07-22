"use client";

import { Menu, X } from "lucide-react";

type HeaderProps = {
  title: string;
  loading: boolean;
  loadingLabel?: string;
  onOpenSidebar: () => void;
};

export function Header({ title, loading, loadingLabel, onOpenSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
          {loading && loadingLabel && (
            <p className="text-xs text-primary">{loadingLabel}</p>
          )}
        </div>
      </div>
      <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        Course Copilot
      </span>
    </header>
  );
}

export function DrawerCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
