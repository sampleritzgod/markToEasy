import { LoginButton } from "@/components/login-button";

export function Header() {
  return (
    <header className="flex items-start justify-between gap-4 border-b pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MarkToEasy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask questions about your course transcripts.
        </p>
      </div>
      <LoginButton />
    </header>
  );
}
