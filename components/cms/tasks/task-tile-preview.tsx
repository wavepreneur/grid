import type { StudioTaskContent } from "@/lib/cms/types";
import { tileTypeIcon } from "@/lib/grid/level-content";

type Props = {
  title: string;
  content: StudioTaskContent;
  solo?: boolean;
  compact?: boolean;
};

export function TaskTilePreview({ title, content, solo = false, compact = false }: Props) {
  const firstTile = content.tiles?.[0];
  const coverUrl =
    firstTile?.cover_image_url?.trim() || content.hero_image_url?.trim() || undefined;
  const tileCount = content.tiles?.length ?? 0;

  const sizeClass = compact ? "h-11 w-11 rounded-lg" : solo ? "w-44" : "w-36";

  return (
    <div className={`flex ${solo ? "justify-center" : compact ? "shrink-0" : "justify-start"}`}>
      <div
        className={`relative aspect-square overflow-hidden border border-slate-200 bg-slate-100 shadow-sm ${
          compact ? "rounded-lg" : "rounded-2xl"
        } ${sizeClass}`}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div
            className={`flex h-full flex-col items-center justify-center ${
              compact ? "p-1" : "gap-2 p-4"
            }`}
          >
            <span className={compact ? "text-lg" : "text-3xl"}>
              {tileCount > 0 ? tileTypeIcon(firstTile!.media_type) : "🧩"}
            </span>
            {!compact ? (
              <span className="line-clamp-2 text-center text-xs font-medium text-slate-700">
                {tileCount > 0 ? `${tileCount} Kachel${tileCount === 1 ? "" : "n"}` : title}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
