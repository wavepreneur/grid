"use client";

import { useEffect, useMemo, useState } from "react";
import { getDirectoryCity, listDirectoryCountries, searchDirectoryCities } from "@/app/actions/cms/cities";
import { StudioLabel, StudioSelect } from "@/components/cms/studio-ui";
import { StudioInput } from "@/components/cms/studio-ui";
import {
  cityLabelDe,
  countryLabelDe,
  sortCountriesDeFirst,
  type DirectoryCity,
  type DirectoryCountry,
} from "@/lib/cms/city-directory";

type Props = {
  value: string | null;
  selected?: DirectoryCity | null;
  onChange: (city: DirectoryCity | null) => void;
  placeholder?: string;
};

export function CitySearchSelect({ value, selected, onChange, placeholder }: Props) {
  const [countries, setCountries] = useState<DirectoryCountry[]>([]);
  const [country, setCountry] = useState(selected?.country || "DE");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<DirectoryCity[]>([]);
  const [picked, setPicked] = useState<DirectoryCity | null>(selected ?? null);

  useEffect(() => {
    void listDirectoryCountries().then((result) => {
      if (result.success) setCountries(sortCountriesDeFirst(result.data ?? []));
    });
  }, []);

  useEffect(() => {
    if (selected?.id && selected.id === value) {
      setPicked(selected);
      if (selected.country) setCountry(selected.country);
    }
  }, [selected, value]);

  useEffect(() => {
    if (!value || picked?.id === value) return;
    let cancelled = false;
    void getDirectoryCity(value).then((result) => {
      if (cancelled || !result.success || !result.data) return;
      setPicked(result.data);
      if (result.data.country) setCountry(result.data.country);
    });
    return () => {
      cancelled = true;
    };
  }, [value, picked?.id]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void searchDirectoryCities(query, country).then((result) => {
        if (cancelled || !result.success) return;
        const rows = result.data ?? [];
        setCities(rows);
        if (value) {
          const match = rows.find((city) => city.id === value);
          if (match) {
            setPicked(match);
            if (match.country) setCountry(match.country);
          }
        }
      });
    }, query ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, country, value]);

  const label = useMemo(() => {
    if (picked && (!value || picked.id === value)) return cityLabelDe(picked);
    if (selected && selected.id === value) return cityLabelDe(selected);
    return value ? "Gewählte Stadt" : "";
  }, [picked, selected, value]);

  const countryOptions = useMemo(() => {
    const rows = countries.length > 0 ? countries : [{ code: country || "DE", name: country || "DE", name_en: null }];
    if (country && !rows.some((row) => row.code === country)) {
      return [{ code: country, name: country, name_en: null }, ...rows];
    }
    return rows;
  }, [countries, country]);

  return (
    <div className="space-y-3">
      <div>
        <StudioLabel>Land</StudioLabel>
        <StudioSelect
          value={country}
          aria-label="Land"
          onChange={(e) => {
            setCountry(e.target.value);
            setQuery("");
            setOpen(true);
          }}
        >
          {countryOptions.map((row) => (
            <option key={row.code} value={row.code}>
              {countryLabelDe(row)}
            </option>
          ))}
        </StudioSelect>
      </div>
      <div className="relative">
        <StudioLabel>Stadt</StudioLabel>
        <StudioInput
          value={open ? query : label}
          placeholder={placeholder ?? "Stadt suchen…"}
          onFocus={() => {
            setOpen(true);
            setQuery(label && label !== "Gewählte Stadt" ? label : "");
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
                Keine Stadt gefunden. Tippe den Exitmania-Namen, unabhängig vom Land.
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
                    setCountry(city.country);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span>{cityLabelDe(city)}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {city.country}
                    {city.name_en && city.name_en !== city.name ? ` · ${city.name_en}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
