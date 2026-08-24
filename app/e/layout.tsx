import type { ReactNode } from "react";
import type { Viewport } from "next";
import { PlayViewportGuard } from "@/components/game/play-viewport-guard";

/**
 * Player routes (/e/…): lock scale like a native shell.
 * Prevents iOS Safari from keeping focus-zoom after lobby name fields.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f7f6f0",
};

export default function EventPlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid-play-shell h-[var(--vv-height,100dvh)] max-h-[var(--vv-height,100dvh)] overflow-hidden">
      <PlayViewportGuard />
      {children}
    </div>
  );
}
