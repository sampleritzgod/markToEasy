"use client";

import { signOut } from "next-auth/react";
import { Keyboard, HelpCircle, BarChart3, Settings, LogOut } from "lucide-react";

import { DrawerCloseButton } from "@/components/chat/header";
import { cn } from "@/lib/utils";

type ProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function ProfileDrawer({ open, onClose, name, email, image }: ProfileDrawerProps) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/40"
          onClick={onClose}
          aria-label="Close profile drawer"
        />
      )}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-sm font-semibold">Profile</h2>
          <DrawerCloseButton onClose={onClose} />
        </div>

        <div className="border-b border-border px-4 py-6">
          <div className="flex items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-14 w-14 rounded-full" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {(name?.[0] ?? email?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{name ?? "User"}</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
              <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                Free plan
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <DrawerLink icon={Settings} label="Profile settings" />
          <DrawerLink icon={BarChart3} label="Usage statistics" disabled />
          <DrawerLink icon={BarChart3} label="API usage" disabled />
          <DrawerLink icon={Keyboard} label="Keyboard shortcuts" disabled />
          <DrawerLink icon={HelpCircle} label="Help" disabled />
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function DrawerLink({
  icon: Icon,
  label,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {disabled && <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>}
    </button>
  );
}
