"use client";

/**
 * Close a popover on the next outside pointer, not the gesture that opened it.
 * Attaching immediately would catch the same click's leftover events and snap shut.
 */
export function listenOutsidePointer(
  root: HTMLElement | null,
  onOutside: () => void,
): () => void {
  let armed = false;
  const arm = window.setTimeout(() => {
    armed = true;
  }, 0);

  function onPointer(event: PointerEvent) {
    if (!armed) return;
    if (root?.contains(event.target as Node)) return;
    onOutside();
  }

  document.addEventListener("pointerdown", onPointer);
  return () => {
    window.clearTimeout(arm);
    document.removeEventListener("pointerdown", onPointer);
  };
}
