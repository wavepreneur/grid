"use client";

import { useEffect, useMemo, useState } from "react";
import { searchDirectoryCities } from "@/app/actions/cms/cities";
import { StudioInput } from "@/components/cms/studio-ui";
import { cityLabelDe, type DirectoryCity } from "@/lib/cms/city-directory";

type Props = {
  value: string | null;
  selected?: DirectoryCity | null;
  onChange: (city: DirectoryCity | null) => void;
  placeholder?: string;
};

export function CitySearchSelect({ value, selected, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<DirectoryCity[]>([]);
  const [picked, setPicked] = useState<DirectoryCity | null>(selected ?? null);

  useEffect(() => {
    if (selected?.id === value) setPicked(selected);
  }, [selected, value]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void searchDirectoryCities(query).then((result) => {
        if (cancelled || !result.success) return;
        const rows = result.data ?? [];
        setCities(rows);
        if (value) {
          const match = rows.find((city) => city.id === value);
          if (match) setPicked(match);
        }
      });
    }, query ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, value]);

  const label = useMemo(() => {
    if (!value) return "";
    if (picked?.id === value) return cityLabelDe(picked);
    return selected && selected.id === value ? cityLabelDe(selected) : "Gewählte Stadt";
  }, [picked, selected, value]);

  return (
    <div className="relative">
      <StudioInput
        value={open ? query : label}
        placeholder={placeholder ?? "Exitmania-Stadt suchen…"}
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
          {cities.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Mindestens zwei Buchstaben — Namen kommen aus Exitmania, nicht aus einem Slug.
            </p>
          ) : (
            cities.map((city) => (
              <button
                key={city.id}
                type="button"
                className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary ${
                  city.id === value ? "bg-primary/10 font-semibold" : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(city);
                  setPicked(city);
                  setOpen(false);
                }}
              >
                <span>{cityLabelDe(city)}</span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {city.slug}
                  {city.name_en && city.name_en !== city.name ? ` · ${city.name_en}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
