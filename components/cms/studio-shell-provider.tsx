"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StudioOrganization } from "@/lib/cms/types";

type StudioShellContextValue = {
  organizations: StudioOrganization[];
  orgSlug: string;
};

const StudioShellContext = createContext<StudioShellContextValue | null>(null);

export function StudioShellProvider({
  organizations,
  orgSlug,
  children,
}: StudioShellContextValue & { children: ReactNode }) {
  return (
    <StudioShellContext.Provider value={{ organizations, orgSlug }}>
      {children}
    </StudioShellContext.Provider>
  );
}

export function useStudioShell(): StudioShellContextValue {
  const value = useContext(StudioShellContext);
  if (!value) {
    throw new Error("useStudioShell must be used within StudioShellProvider");
  }
  return value;
}
