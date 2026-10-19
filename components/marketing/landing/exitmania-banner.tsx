"use client";

import { copy } from "@/components/marketing/landing/copy";
import { useFromExitmania } from "@/components/marketing/landing/use-from-exitmania";

export function ExitmaniaBanner() {
  if (!useFromExitmania()) return null;
  return (
    <div className="tl-from" role="note">
      <p className="tl-container">{copy.fromExitmania}</p>
    </div>
  );
}
