import { X as XIcon } from "lucide-react";
import { type ReactNode } from "react";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink/95 py-0 sm:py-8">
      <div className="screen-shell relative min-h-screen overflow-hidden bg-background shadow-lift sm:min-h-[calc(100vh-4rem)] sm:rounded-4xl">
        {children}
      </div>
    </div>
  );
}

export function BigButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "accent" | "ghost" | "outline";
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground shadow-lift",
    accent: "bg-accent text-accent-foreground shadow-lift",
    ghost: "bg-secondary text-secondary-foreground",
    outline: "border-2 border-border bg-card text-foreground",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tap-lift flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-lg font-semibold disabled:opacity-40 ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

export function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="tap-lift flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground"
    >
      {children}
    </button>
  );
}

export function Sheet({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-ink/60 backdrop-blur-sm sm:rounded-4xl">
      <div className="animate-rise-in w-full space-y-4 rounded-t-3xl bg-card p-5 pb-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-xl font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="tap-lift flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ChatBubble({ children, side }: { children: ReactNode; side: "me" | "them" }) {
  return (
    <p
      className={`max-w-[80%] rounded-2xl px-4 py-3 text-base ${
        side === "me"
          ? "ml-auto bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </p>
  );
}

/**
 * Bühne für den Online-Modus: gleiche Designsprache wie der Phone-Shell,
 * aber sie wächst auf Tablet und Desktop in die Breite statt nur zu skalieren.
 * Hochformat = gestapelt, Querformat/Desktop = zweispaltig (Inhalt + Live-Team).
 */
export function StageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink/95">
      <div className="mx-auto min-h-screen w-full max-w-7xl bg-background shadow-lift xl:my-6 xl:min-h-[calc(100vh-3rem)] xl:rounded-4xl">
        {children}
      </div>
    </div>
  );
}

/** Zweispaltiges Layout: ab Querformat/Desktop steht das Live-Team rechts daneben. */
export function StageColumns({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start landscape:max-lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-4">{main}</div>
      <div className="min-w-0 space-y-4 lg:sticky lg:top-4">{side}</div>
    </div>
  );
}
