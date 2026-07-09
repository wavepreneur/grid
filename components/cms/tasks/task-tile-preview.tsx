import type { StudioTaskContent } from "@/lib/cms/types";
import { TASK_ICON_KEYS } from "@/lib/cms/types";

const ICONS: Record<string, string> = {
  puzzle: "🧩",
  "map-pin": "📍",
  key: "🔑",
  compass: "🧭",
  lock: "🔒",
  eye: "👁",
  flag: "🏁",
  star: "⭐",
};

type Props = {
  title: string;
  content: StudioTaskContent;
  solo?: boolean;
};

export function TaskTilePreview({ title, content, solo = false }: Props) {
  const icon = ICONS[content.tile.icon_key ?? "puzzle"] ?? "🧩";
  const tileImageUrl =
    content.tile.label_image_url?.trim() ||
    (content.tile.display === "image" ? content.tile.image_url?.trim() : undefined);

  return (
    <div className={`flex ${solo ? "justify-center" : "justify-start"}`}>
      <div
        className={`relative overflow-hidden rounded-2xl border border-[var(--grid-border)] bg-black/30 shadow-lg transition hover:border-[var(--grid-accent)]/40 ${
          solo ? "h-44 w-44" : "h-36 w-36"
        }`}
      >
        {tileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tileImageUrl} alt={content.tile.label || title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
            <span className="text-4xl">{icon}</span>
            <span className="line-clamp-2 text-center text-xs font-medium text-white">
              {content.tile.label || title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskIconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TASK_ICON_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition ${
            value === key
              ? "border-[var(--grid-accent)] bg-[var(--grid-accent-soft)]"
              : "border-[var(--grid-border)] bg-black/20 hover:border-white/20"
          }`}
        >
          {ICONS[key]}
        </button>
      ))}
    </div>
  );
}
