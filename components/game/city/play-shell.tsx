"use client";

import type { ReactNode } from "react";
import { PhoneShell, StageShell } from "@/components/game/city/ui";
import type { ContentMode } from "@/lib/cms/layer-model";

type Props = {
  mode?: ContentMode;
  children: ReactNode;
};

/** Outer chrome for player routes — constrained column on every surface/device. */
export function CityPlayShell({ mode = "outdoor", children }: Props) {
  if (mode === "online") {
    return <StageShell>{children}</StageShell>;
  }
  return <PhoneShell>{children}</PhoneShell>;
}
