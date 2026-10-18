/** Play captures: sharp enough for a phone gallery, small enough to upload. */

export const CAPTURE_PHOTO_MAX_EDGE = 1600;
export const CAPTURE_PHOTO_QUALITY = 0.82;
export const CAPTURE_VIDEO_WIDTH = 1280;
export const CAPTURE_VIDEO_HEIGHT = 720;
export const CAPTURE_VIDEO_FPS = 30;
export const CAPTURE_VIDEO_BITS_PER_SECOND = 2_400_000;
export const CAPTURE_AUDIO_BITS_PER_SECOND = 96_000;

export function fitCaptureSize(
  width: number,
  height: number,
  maxEdge = CAPTURE_PHOTO_MAX_EDGE,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const scale = maxEdge / long;
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

export function captureVideoTrackConstraints(): MediaTrackConstraints {
  return {
    facingMode: { ideal: "environment" },
    width: { ideal: CAPTURE_VIDEO_WIDTH, max: CAPTURE_VIDEO_WIDTH },
    height: { ideal: CAPTURE_VIDEO_HEIGHT, max: CAPTURE_VIDEO_HEIGHT },
    frameRate: { ideal: CAPTURE_VIDEO_FPS, max: CAPTURE_VIDEO_FPS },
  };
}

export function captureRecorderOptions(mimeType: string): MediaRecorderOptions {
  const options: MediaRecorderOptions = {
    videoBitsPerSecond: CAPTURE_VIDEO_BITS_PER_SECOND,
    audioBitsPerSecond: CAPTURE_AUDIO_BITS_PER_SECOND,
  };
  if (mimeType) options.mimeType = mimeType;
  return options;
}

export function createCaptureRecorder(
  stream: MediaStream,
  mimeType: string,
): MediaRecorder {
  const withRate = captureRecorderOptions(mimeType);
  try {
    return new MediaRecorder(stream, withRate);
  } catch {
    return mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  }
}

export async function encodeCanvasJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CAPTURE_PHOTO_QUALITY),
  );
}

export async function compressCaptureImage(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith("image/") && blob.type !== "") {
    return blob;
  }
  const bitmap = await createImageBitmap(blob);
  const size = fitCaptureSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const compressed = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CAPTURE_PHOTO_QUALITY),
  );
  if (!compressed || compressed.size === 0) return blob;
  if (compressed.size >= blob.size && blob.type === "image/jpeg") return blob;
  return compressed;
}
