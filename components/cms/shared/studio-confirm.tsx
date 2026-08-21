"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { StudioButton } from "@/components/cms/studio-ui";

export type StudioConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red confirm (delete/leave). default = primary. alert = only OK. */
  tone?: "default" | "danger" | "alert";
};

type ConfirmState = StudioConfirmOptions & { open: boolean };

type StudioConfirmContextValue = {
  confirm: (options: StudioConfirmOptions) => Promise<boolean>;
  alert: (options: Omit<StudioConfirmOptions, "tone" | "cancelLabel">) => Promise<void>;
};

const StudioConfirmContext = createContext<StudioConfirmContextValue | null>(null);

const DEFAULT_STATE: ConfirmState = {
  open: false,
  title: "",
  description: undefined,
  confirmLabel: "OK",
  cancelLabel: "Abbrechen",
  tone: "default",
};

export function StudioConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(DEFAULT_STATE);
  }, []);

  const confirm = useCallback((options: StudioConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? (options.tone === "alert" ? "Verstanden" : "OK"),
        cancelLabel: options.cancelLabel ?? "Abbrechen",
        tone: options.tone ?? "default",
      });
    });
  }, []);

  const alert = useCallback(
    async (options: Omit<StudioConfirmOptions, "tone" | "cancelLabel">) => {
      await confirm({ ...options, tone: "alert" });
    },
    [confirm],
  );

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const isAlert = state.tone === "alert";
  const confirmVariant = state.tone === "danger" ? "danger" : "primary";

  return (
    <StudioConfirmContext.Provider value={value}>
      {children}
      <StudioModal
        open={state.open}
        onClose={() => close(false)}
        title={state.title}
        size="md"
        closeOnBackdrop
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {!isAlert ? (
              <StudioButton type="button" variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel}
              </StudioButton>
            ) : null}
            <StudioButton
              type="button"
              variant={isAlert ? "primary" : confirmVariant}
              onClick={() => close(true)}
            >
              {state.confirmLabel}
            </StudioButton>
          </div>
        }
      >
        {state.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{state.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Bitte bestätigen.</p>
        )}
      </StudioModal>
    </StudioConfirmContext.Provider>
  );
}

export function useStudioConfirm(): StudioConfirmContextValue {
  const ctx = useContext(StudioConfirmContext);
  if (!ctx) {
    throw new Error("useStudioConfirm must be used within StudioConfirmProvider");
  }
  return ctx;
}
