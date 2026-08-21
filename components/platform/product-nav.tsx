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
      className={`flex gap-1 rounded-2xl bg-secondary p-1 ${compact ? "w-full" : ""}`}
      aria-label="GRID Produkte"
    >
      {GRID_PRODUCTS.map((product) => {
        const isActive = product.id === active;
        return (
          <Link
            key={product.id}
            href={product.available ? product.href : "#"}
            aria-current={isActive ? "page" : undefined}
            className={`tap-lift flex-1 rounded-xl px-3 py-2 text-center text-xs font-bold transition ${
              isActive
                ? "bg-card text-primary shadow-soft"
                : product.available
                  ? "text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/50"
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
