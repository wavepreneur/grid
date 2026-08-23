"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type StudioUnsavedContextValue = {
  isDirty: boolean;
  markDirty: () => void;
  clearDirty: () => void;
};

const StudioUnsavedContext = createContext<StudioUnsavedContextValue | null>(null);

export function StudioUnsavedProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => {
    setIsDirty((prev) => (prev ? prev : true));
  }, []);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  // Navigation away from detail routes clears the flag.
  useEffect(() => {
    const onEditor =
      pathname.startsWith("/admin/tasks/") || pathname.startsWith("/admin/games/");
    if (!onEditor) setIsDirty(false);
  }, [pathname]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return (
    <StudioUnsavedContext.Provider value={{ isDirty, markDirty, clearDirty }}>
      {children}
    </StudioUnsavedContext.Provider>
  );
}

export function useStudioUnsaved(): StudioUnsavedContextValue {
  const value = useContext(StudioUnsavedContext);
  if (!value) {
    return {
      isDirty: false,
      markDirty: () => undefined,
      clearDirty: () => undefined,
    };
  }
  return value;
}

/**
 * Compares a serialized snapshot to a baseline. Marks dirty on drift;
 * call `acknowledgeSaved(nextSnapshot)` after a successful save.
 */
export function useStudioDirtySnapshot(snapshot: string) {
  const { markDirty, clearDirty } = useStudioUnsaved();
  const baselineRef = useRef(snapshot);

  useEffect(() => {
    if (snapshot === baselineRef.current) return;
    markDirty();
  }, [snapshot, markDirty]);

  const acknowledgeSaved = useCallback(
    (nextSnapshot?: string) => {
      baselineRef.current = nextSnapshot ?? snapshot;
      clearDirty();
    },
    [clearDirty, snapshot],
  );

  return { acknowledgeSaved };
}
