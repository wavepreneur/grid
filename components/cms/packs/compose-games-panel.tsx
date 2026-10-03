"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  archiveComposeRecipe,
  composeGamesFromPacks,
  listComposeRecipes,
  listExistingComposeCities,
  listLayerPacks,
  saveComposeRecipe,
  seedComposeGamesForRecipe,
} from "@/app/actions/cms/packs";
import { publishDraftComposeGames } from "@/app/actions/cms/games";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { StudioButton, StudioError, StudioInput, StudioSuccess } from "@/components/cms/studio-ui";
import {
  IconArchive,
  IconGamepad,
  IconKeyRound,
  IconMapPin,
  IconPlus,
  IconSearch,
  IconStar,
  IconUsers,
} from "@/components/cms/studio-icons";
import { COMPOSE_GAMES_MAX, type StudioComposeRecipe, type StudioLayerPack } from "@/lib/cms/layer-packs";
import { CollectionPicker } from "@/components/cms/games/collection-picker";
import {
  useInvalidateStudioCollections,
  useStudioCollections,
} from "@/lib/hooks/use-studio-collections";
import { useInvalidateStudioPacks } from "@/lib/hooks/use-studio-packs";
import { useInvalidateStudioGames } from "@/lib/hooks/use-studio-games";

type Surface = "outdoor" | "indoor";
type OpenLayer = 1 | 2 | 3 | null;

export function ComposeGamesPanel() {
  const invalidate = useInvalidateStudioPacks();
  const invalidateGames = useInvalidateStudioGames();
  const invalidateCollections = useInvalidateStudioCollections();
  const { data: collectionOverview } = useStudioCollections();
  const collections = collectionOverview?.collections ?? [];
  const [recipes, setRecipes] = useState<StudioComposeRecipe[]>([]);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [layer2, setLayer2] = useState<string | null>(null);
  const [layer3, setLayer3] = useState<string | null>(null);
  const [layer2Name, setLayer2Name] = useState("Mission wählen");
  const [layer3Name, setLayer3Name] = useState("Team wählen");
  const [surface, setSurface] = useState<Surface>("outdoor");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [openLayer, setOpenLayer] = useState<OpenLayer>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [archiving, startArchive] = useTransition();
  useEffect(() => {
    void listComposeRecipes().then((result) => {
      if (result.success) setRecipes(result.data ?? []);
    });
  }, []);

  function resetDraft() {
    setRecipeId(null);
    setRecipeName("");
    setLayer2(null);
    setLayer3(null);
    setLayer2Name("Mission wählen");
    setLayer3Name("Team wählen");
    setSurface("outdoor");
    setCollectionId(collections[0]?.id ?? null);
  }

  function selectRecipe(recipe: StudioComposeRecipe) {
    setCreating(false);
    setRecipeId(recipe.id);
    setRecipeName(recipe.name);
    setLayer2(recipe.layer2_pack_id);
    setLayer3(recipe.layer3_pack_id);
    setSurface(recipe.surface === "indoor" ? "indoor" : "outdoor");
    setLayer2Name(recipe.layer2_pack_id ? "Mission" : "Mission wählen");
    setLayer3Name(recipe.layer3_pack_id ? "Team" : "Team wählen");
    setCollectionId(recipe.collection_id);
    void resolvePackName(2, recipe.layer2_pack_id).then((name) => {
      if (name) setLayer2Name(name);
    });
    void resolvePackName(3, recipe.layer3_pack_id).then((name) => {
      if (name) setLayer3Name(name);
    });
    setError(null);
    setMessage(null);
  }

  const active = creating || Boolean(recipeId);
  const selectedRecipe = recipes.find((row) => row.id === recipeId) ?? null;

  return (
    <section className="overflow-hidden rounded-3xl bg-card shadow-soft">
      <div className="border-b border-border/70 px-5 py-5 sm:px-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Schritt 2</p>
        <h2 className="mt-1 text-xl font-bold">Rezept kombinieren</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Mission und Team aus den Teilen, die du oben benannt hast. Dann die Städte oder Stationen
          dazu — fertig sind die neuen Spiele.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 py-4 sm:px-7">
        {recipes.map((recipe) => {
          const selected = recipe.id === recipeId && !creating;
          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => selectRecipe(recipe)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-left transition ${
                selected
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              <p className="text-sm font-bold">{recipe.name}</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${selected ? "opacity-80" : "text-muted-foreground"}`}>
                {recipe.surface === "indoor" ? "Indoor" : "Outdoor"}
                {recipe.collection_id
                  ? ` · ${collections.find((row) => row.id === recipe.collection_id)?.name ?? "Collection"}`
                  : ""}
                {recipe.origin_game_name ? ` · ${recipe.origin_game_name}` : ""}
              </p>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            resetDraft();
            setCreating(true);
          }}
          className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-bold ${
            creating
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          <IconPlus size={16} />
          Neues Rezept
        </button>
      </div>

      {error ? (
        <div className="px-5 sm:px-7">
          <StudioError message={error} />
        </div>
      ) : null}
      {message ? (
        <div className="px-5 sm:px-7">
          <StudioSuccess message={message} />
        </div>
      ) : null}

      {active ? (
        <div className="px-5 pb-7 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Name
              </label>
              <StudioInput
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="z. B. Standard Game B2C"
              />
            </div>
            <div className="min-w-[16rem] flex-1">
              <CollectionPicker
                value={collectionId}
                collections={collections}
                onChange={setCollectionId}
                onCreated={() => invalidateCollections()}
                hint="Neue Städte-Spiele landen in dieser Collection"
              />
            </div>
            <div className="flex rounded-2xl bg-secondary p-1">
              {(["outdoor", "indoor"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSurface(mode)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold ${
                    surface === mode ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                  }`}
                >
                  {mode === "outdoor" ? "Outdoor" : "Indoor"}
                </button>
              ))}
            </div>
          </div>

          {selectedRecipe ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-secondary/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {selectedRecipe.origin_game_id ? (
                <Link
                  href={`/app/games/${selectedRecipe.origin_game_id}`}
                  className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                >
                  <IconStar size={16} className="fill-amber-500 text-amber-500" />
                  <span className="truncate">
                    Hauptspiel: {selectedRecipe.origin_game_name ?? "Ursprung öffnen"}
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Noch kein Hauptspiel — das erste Spiel mit Spielinfo wird zur Quelle.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <StudioButton
                  type="button"
                  size="sm"
                  disabled={archiving}
                  onClick={() => {
                    startArchive(async () => {
                      setError(null);
                      const saved = await saveComposeRecipe({
                        id: selectedRecipe.id,
                        name: recipeName.trim() || selectedRecipe.name,
                        layer2_pack_id: layer2,
                        layer3_pack_id: layer3,
                        surface,
                        collection_id: collectionId,
                      });
                      if (!saved.success) {
                        setError(saved.error);
                        return;
                      }
                      setRecipes((current) =>
                        current.map((row) => (row.id === saved.data.id ? saved.data : row)),
                      );
                      let created = 0;
                      let skipped = 0;
                      let originName = saved.data.origin_game_name ?? "First Profiler München";
                      for (;;) {
                        const result = await seedComposeGamesForRecipe(saved.data.id);
                        if (!result.success) {
                          setError(result.error);
                          if (created > 0) {
                            invalidate();
                            invalidateGames();
                          }
                          return;
                        }
                        created += result.data?.createdCount ?? 0;
                        skipped = result.data?.skippedCount ?? skipped;
                        originName = result.data?.originName ?? originName;
                        const remaining = result.data?.remainingCount ?? 0;
                        setMessage(
                          remaining > 0
                            ? `${created} Spiele angelegt, ${remaining} fehlen noch (Vorlage ${originName}).`
                            : created > 0
                              ? `${created} Spiele angelegt (Vorlage ${originName}).`
                              : `${skipped} Städte gibt es in diesem Rezept schon.`,
                        );
                        if (remaining === 0 || (result.data?.createdCount ?? 0) === 0) break;
                      }
                      invalidate();
                      invalidateGames();
                    });
                  }}
                >
                  {archiving ? "Spiele werden angelegt…" : "Fehlende Städte anlegen"}
                </StudioButton>
                <StudioButton
                  type="button"
                  size="sm"
                  disabled={archiving}
                  onClick={() => {
                    startArchive(async () => {
                      setError(null);
                      let published = 0;
                      for (;;) {
                        const result = await publishDraftComposeGames(selectedRecipe.id);
                        if (!result.success) {
                          setError(result.error);
                          if (published > 0) invalidateGames();
                          return;
                        }
                        published += result.data?.publishedCount ?? 0;
                        const remaining = result.data?.remainingCount ?? 0;
                        const failed = result.data?.failedCount ?? 0;
                        if (failed > 0 && result.data?.errors?.length) {
                          setError(result.data.errors[0] ?? "Veröffentlichen fehlgeschlagen.");
                        }
                        setMessage(
                          remaining > 0
                            ? `${published} Spiele veröffentlicht, ${remaining} Entwürfe fehlen noch.`
                            : `${published} Spiele veröffentlicht.`,
                        );
                        if (remaining === 0 || (result.data?.publishedCount ?? 0) === 0) break;
                      }
                      invalidateGames();
                    });
                  }}
                >
                  {archiving ? "Wird veröffentlicht…" : "Entwürfe veröffentlichen"}
                </StudioButton>
                <StudioButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={archiving}
                  icon={<IconArchive size={16} />}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Rezept archivieren? Bestehende Spiele bleiben. Neue Städte kannst du damit nicht mehr anlegen.",
                      )
                    ) {
                      return;
                    }
                    startArchive(async () => {
                      const result = await archiveComposeRecipe(selectedRecipe.id);
                      if (!result.success) {
                        setError(result.error);
                        return;
                      }
                      setRecipes((current) => current.filter((row) => row.id !== selectedRecipe.id));
                      resetDraft();
                      invalidate();
                      setMessage("Rezept archiviert. Die bestehenden Spiele bleiben.");
                    });
                  }}
                >
                  {archiving ? "Archiviert…" : "Rezept archivieren"}
                </StudioButton>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-4">
            <LayerNode
              kicker="Mission"
              title="Die Geschichte"
              value={layer2Name}
              active={Boolean(layer2)}
              icon={<IconGamepad size={28} />}
              onClick={() => setOpenLayer(2)}
            />
            <span className="hidden text-2xl font-light text-border sm:block">+</span>
            <LayerNode
              kicker="Team"
              title="Die Dynamik"
              value={layer3Name}
              active={Boolean(layer3)}
              icon={<IconUsers size={28} />}
              onClick={() => setOpenLayer(3)}
            />
            <span className="hidden text-2xl font-light text-border sm:block">+</span>
            <LayerNode
              kicker="Ort"
              title={surface === "indoor" ? "Stationen" : "Städte"}
              value={
                surface === "indoor"
                  ? "Quizzes + Codes"
                  : creating || !recipeId
                    ? "Städte wählen"
                    : "Städte anhängen"
              }
              icon={surface === "indoor" ? <IconKeyRound size={28} /> : <IconMapPin size={28} />}
              onClick={() => setOpenLayer(1)}
            />
          </div>
        </div>
      ) : (
        <p className="px-5 pb-7 text-sm text-muted-foreground sm:px-7">
          Neues Rezept: zuerst Mission, dann Team, dann die Orte. Bestätigen legt die Spiele an.
        </p>
      )}

      {openLayer === 1 ? (
        <CityComposeModal
          open
          onClose={() => setOpenLayer(null)}
          layer2Id={layer2}
          layer3Id={layer3}
          layer2Name={layer2Name}
          layer3Name={layer3Name}
          surface={surface}
          recipeId={recipeId}
          recipeName={recipeName}
          collectionId={collectionId}
          onError={setError}
          onCreated={(created, skipped, savedRecipe) => {
            setOpenLayer(null);
            if (savedRecipe) {
              setRecipeId(savedRecipe.id);
              setCreating(false);
              setRecipes((current) => [savedRecipe, ...current.filter((row) => row.id !== savedRecipe.id)]);
            }
            invalidate();
            invalidateGames();
            setMessage(
              created > 0
                ? `${created} Spiel${created === 1 ? "" : "e"} angelegt${skipped ? `, ${skipped} schon vorhanden` : ""}.`
                : skipped
                  ? "Alle gewählten Städte gibt es in diesem Rezept schon."
                  : "Keine neuen Spiele.",
            );
          }}
        />
      ) : null}

      {openLayer === 2 || openLayer === 3 ? (
        <PackPickModal
          open
          layer={openLayer}
          currentId={openLayer === 2 ? layer2 : layer3}
          onClose={() => setOpenLayer(null)}
          onPick={(pack) => {
            if (openLayer === 2) {
              setLayer2(pack?.id ?? null);
              setLayer2Name(pack?.name ?? "Mission wählen");
            } else {
              setLayer3(pack?.id ?? null);
              setLayer3Name(pack?.name ?? "Team wählen");
            }
            setOpenLayer(null);
          }}
        />
      ) : null}
    </section>
  );
}

async function resolvePackName(layer: 2 | 3, packId: string | null): Promise<string | null> {
  if (!packId) return null;
  const result = await listLayerPacks({ layer, limit: 200 });
  if (!result.success) return null;
  return result.data?.find((pack) => pack.id === packId)?.name ?? null;
}

async function runCompose(
  cityIds: string[],
  recipeId: string | null,
  surface: Surface,
  layer2: string | null,
  layer3: string | null,
) {
  return composeGamesFromPacks({
    surface,
    layer1_pack_ids: cityIds,
    layer2_pack_id: layer2,
    layer3_pack_id: layer3,
    recipe_id: recipeId,
  });
}

function LayerNode({
  kicker,
  title,
  value,
  icon,
  active,
  onClick,
}: {
  kicker: string;
  title: string;
  value: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="group flex w-40 flex-col items-center text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{title}</p>
      <span
        className={`mt-3 flex h-[5.6rem] w-[5.1rem] items-center justify-center transition ${
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground group-hover:bg-primary/15"
        }`}
        style={{ clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}
      >
        {icon}
      </span>
      <span className="mt-3 max-w-full truncate rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">
        {value}
      </span>
    </button>
  );
}

function PackPickModal({
  open,
  layer,
  currentId,
  onClose,
  onPick,
}: {
  open: boolean;
  layer: 2 | 3;
  currentId: string | null;
  onClose: () => void;
  onPick: (pack: StudioLayerPack | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [packs, setPacks] = useState<StudioLayerPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void listLayerPacks({ layer, search: query, limit: 200 }).then((result) => {
      if (result.success) setPacks(result.data ?? []);
      setLoading(false);
    });
  }, [open, layer, query]);

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      title={layer === 2 ? "Mission wählen" : "Team wählen"}
      subtitle={
        layer === 2
          ? "Die Namen, die du beim Aufteilen vergeben hast — einmal, für alle Städte."
          : "Die Team-Teile aus demselben Spiel."
      }
      footer={
        <StudioButton type="button" variant="ghost" onClick={() => onPick(null)}>
          Keinen wählen
        </StudioButton>
      }
    >
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <StudioInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen…"
          className="pl-10"
        />
      </div>
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {loading ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">Teile laden…</p>
        ) : (
          packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => onPick(pack)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${
                pack.id === currentId ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              <span className="font-semibold">{pack.name}</span>
              <span className="text-xs opacity-70">{pack.slot_count} Stops</span>
            </button>
          ))
        )}
        {!loading && packs.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            Noch kein Teil. Teile zuerst oben ein getestetes Spiel und gib der{" "}
            {layer === 2 ? "Mission" : "Team-Dynamik"} einen Namen.
          </p>
        ) : null}
      </div>
    </StudioModal>
  );
}

function CityComposeModal({
  open,
  onClose,
  layer2Id,
  layer3Id,
  layer2Name,
  layer3Name,
  surface,
  recipeId,
  recipeName,
  collectionId,
  onError,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  layer2Id: string | null;
  layer3Id: string | null;
  layer2Name: string;
  layer3Name: string;
  surface: Surface;
  recipeId: string | null;
  recipeName: string;
  collectionId: string | null;
  onError: (message: string | null) => void;
  onCreated: (
    created: number,
    skipped: number,
    recipe: StudioComposeRecipe | undefined,
  ) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<StudioLayerPack[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void Promise.all([
      listLayerPacks({ layer: 1, search: query, limit: COMPOSE_GAMES_MAX }),
      listExistingComposeCities({ layer2_pack_id: layer2Id, layer3_pack_id: layer3Id }),
    ]).then(([cityResult, existingResult]) => {
      setLoading(false);
      if (cityResult.success) setCities(cityResult.data ?? []);
      if (existingResult.success) setExisting(new Set(existingResult.data?.layer1PackIds ?? []));
    });
  }, [open, query, layer2Id, layer3Id]);

  const available = useMemo(() => cities.filter((city) => !existing.has(city.id)), [cities, existing]);
  const createCount = selected.filter((id) => !existing.has(id)).length;

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      size="lg"
      title={surface === "indoor" ? "Stationen wählen" : "Städte wählen"}
      subtitle={
        surface === "indoor"
          ? `Quizzes mit Code im Gebäude — kein Stadtquiz. ${layer2Name} und ${layer3Name} bleiben.`
          : `Dieselbe Mission und dasselbe Team für mehrere Städte. ${layer2Name} · ${layer3Name}`
      }
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <StudioButton type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </StudioButton>
          <StudioButton
            type="button"
            disabled={pending || createCount === 0 || recipeName.trim().length < 2}
            onClick={() => {
              const cityIds = selected.filter((id) => !existing.has(id));
              startTransition(async () => {
                onError(null);
                const saved = await saveComposeRecipe({
                  id: recipeId ?? undefined,
                  name: recipeName.trim(),
                  layer2_pack_id: layer2Id,
                  layer3_pack_id: layer3Id,
                  surface,
                  collection_id: collectionId,
                });
                if (!saved.success) {
                  onError(saved.error);
                  return;
                }
                const run = await runCompose(cityIds, saved.data.id, surface, layer2Id, layer3Id);
                if (!run.success) {
                  onError(run.error);
                  return;
                }
                onCreated(run.data?.createdCount ?? 0, run.data?.skippedCount ?? 0, saved.data);
              });
            }}
          >
            {createCount} neue Spiele erstellen
          </StudioButton>
        </div>
      }
    >
      {!layer2Id && !layer3Id ? (
        <p className="text-sm text-muted-foreground">Zuerst Mission oder Team wählen.</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <StudioInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={surface === "indoor" ? "Quiz-Pack suchen…" : "Suche nach Stadt…"}
            className="pl-10"
          />
        </div>
        <StudioButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSelected(available.map((city) => city.id))}
        >
          Alle verfügbaren
        </StudioButton>
      </div>

      <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            {surface === "indoor" ? "Packs laden…" : "Städte laden…"}
          </p>
        ) : null}
        {cities.map((city) => {
          const taken = existing.has(city.id);
          const checked = selected.includes(city.id);
          return (
            <label
              key={city.id}
              className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${
                taken ? "bg-secondary/70 text-muted-foreground" : "hover:bg-secondary"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={taken}
                checked={taken || checked}
                onChange={() => {
                  if (taken) return;
                  setSelected((current) =>
                    checked ? current.filter((id) => id !== city.id) : [...current, city.id],
                  );
                }}
              />
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${taken ? "" : "text-foreground"}`}>
                  {city.name}
                </span>
                {taken ? (
                  <span className="block text-xs">
                    Gibt es schon mit {layer2Name} und {layer3Name}
                  </span>
                ) : (
                  <span className="block text-xs text-muted-foreground">
                    {city.slot_count} Stops ·{" "}
                    {surface === "indoor"
                      ? "Code öffnet das Quiz im Raum"
                      : "bekommt GPS-Felder"}
                  </span>
                )}
              </span>
            </label>
          );
        })}
        {!loading && cities.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            {surface === "indoor"
              ? "Noch keine Stationen. Teile zuerst ein Indoor-Spiel oder lege unten einen Ort ohne Spiel an."
              : "Noch keine Städte. Teile zuerst ein Spiel oder hänge unten eine Exitmania-Stadt an."}
          </p>
        ) : null}
      </div>

      {recipeName.trim().length < 2 ? (
        <p className="mt-3 text-xs font-semibold text-amber-800">Bitte zuerst dem Rezept einen Namen geben.</p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        {recipeId
          ? surface === "indoor"
            ? "Rezept bleibt, nur neue Station-Packs kommen dazu."
            : "Rezept bleibt, nur neue Städte kommen dazu."
          : "Beim Erzeugen wird das Rezept gespeichert."}{" "}
        Graue Einträge überspringen wir.
      </p>
    </StudioModal>
  );
}
