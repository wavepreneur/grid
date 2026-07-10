"use client";

import Link from "next/link";
import { GRID_PRODUCTS, type GridProduct } from "@/lib/platform/products";

type Props = {
  active: GridProduct;
  compact?: boolean;
};

export function ProductNav({ active, compact = false }: Props) {
  return (
    <nav
      className={`flex gap-1 rounded-xl bg-slate-100 p-1 ${compact ? "w-full" : ""}`}
      aria-label="GRID Produkte"
    >
      {GRID_PRODUCTS.map((product) => {
        const isActive = product.id === active;
        return (
          <Link
            key={product.id}
            href={product.available ? product.href : "#"}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold transition ${
              isActive
                ? "bg-white text-teal-700 shadow-sm"
                : product.available
                  ? "text-slate-600 hover:text-slate-900"
                  : "cursor-not-allowed text-slate-400"
            }`}
            title={product.description}
          >
            GRID {product.label}
          </Link>
        );
      })}
    </nav>
  );
}
