/** Player tile rendering uses a 1:1 box with object-cover — source images should match. */
export const TASK_TILE_IMAGE_SPEC = {
  aspectRatio: "1:1",
  widthPx: 512,
  heightPx: 512,
  minWidthPx: 256,
  maxFileSizeMb: 5,
  formats: ["JPEG", "PNG", "WebP"] as const,
} as const;

export const TASK_TILE_IMAGE_UPLOAD_HINT =
  "Quadratisch 512×512 px (min. 256×256) · JPEG, PNG oder WebP · max. 5 MB — füllt die Kachel randlos ohne Rand.";

export const TASK_TILE_IMAGE_UPLOAD_DETAIL =
  "Bild im Format 1:1 exportieren, wichtiger Inhalt mittig platzieren. Dann passt es 1:1 auf die Kachel, ohne Beschnitt an den Rändern oder sichtbaren Rändern.";
