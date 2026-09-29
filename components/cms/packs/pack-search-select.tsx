"use client";

import { useEffect, useMemo, useState } from "react";
import { listLayerPacks } from "@/app/actions/cms/packs";
import { StudioInput } from "@/components/cms/studio-ui";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { layerPackLabelDe, type StudioLayerPack } from "@/lib/cms/layer-packs";

type Props = {
  layer: StudioLayer;
  value: string | null;
  onChange: (packId: string | null, pack?: StudioLayerPack | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
};

export function PackSearchSelect({
  layer,
  value,
  onChange,
  placeholder,
  allowEmpty = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<StudioLayerPack[]>([]);
  const [selected, setSelected] = useState<StudioLayerPack | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void listLayerPacks({ layer, search: query, limit: layer === 1 ? 40 : 200 }).then((result) => {
        if (cancelled || !result.success) return;
        setPacks(result.data ?? []);
        if (value) {
          const match = (result.data ?? []).find((pack) => pack.id === value);
          if (match) setSelected(match);
        }
      });
    }, query ? 160 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [layer, query, value]);

  const label = useMemo(() => {
    if (!value) return "";
    if (selected?.id === value) {
      return selected.city_slug ? `${selected.name} (${selected.city_slug})` : selected.name;
    }
    return "Gewähltes Pack";
  }, [selected, value]);

  return (
    <div className="relative">
      <StudioInput
        value={open ? query : label}
        placeholder={placeholder ?? `${layerPackLabelDe(layer)} suchen…`}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
      />
      {open ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-soft">
          {allowEmpty ? (
            <button
              type="button"
              className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(null, null);
                setSelected(null);
                setOpen(false);
              }}
            >
              Kein Pack
            </button>
          ) : null}
          {packs.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {layer === 1 ? "Stadtname tippen — die Liste bleibt kurz, auch bei 100.000 Städten." : "Noch keine Packs."}
            </p>
          ) : (
            packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary ${
                  pack.id === value ? "bg-primary/10 font-semibold" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(pack.id, pack);
                  setSelected(pack);
                  setOpen(false);
                }}
              >
                <span>{pack.name}</span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {pack.city_slug ? pack.city_slug : `${pack.slot_count} Stops`}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
