"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-[#0F5C4A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0B4A3B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C4A]"
    >
      {label}
    </button>
  );
}
