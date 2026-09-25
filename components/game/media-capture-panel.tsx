"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, X } from "lucide-react";
import { uploadEventCapture } from "@/app/actions/captures";
import { BigButton } from "@/components/game/city/ui";
import { GridButton, GridHint } from "@/components/grid/grid-shell";
import { EVENT_CAPTURE_VIDEO_MAX_SECONDS } from "@/lib/grid/event-captures";
import type { MediaInputMode, SolveLevelPayload } from "@/lib/grid/level-types";

type CaptureContext = {
  inviteCode: string;
  joinCode: string;
  sessionId: string;
};

type Props = {
  kind: MediaInputMode;
  overlayImageUrl?: string;
  levelNumber: number;
  bonusId?: string;
  disabled: boolean;
  isPending: boolean;
  captureContext?: CaptureContext;
  cityStyle?: boolean;
  canPaceTeam?: boolean;
  leadLabel?: string;
  /** Level skip / pace hint. Bonus capture hides both. */
  allowSkip?: boolean;
  onSubmit: (payload: SolveLevelPayload) => void;
};

type Phase = "live" | "preview";

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionForMime(mime: string, kind: MediaInputMode): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return kind === "video" ? "webm" : "jpg";
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  ctx.drawImage(source, (dstW - w) / 2, (dstH - h) / 2, w, h);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  ctx.drawImage(source, (dstW - w) / 2, (dstH - h) / 2, w, h);
}

async function saveBlobToDevice(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function MediaCapturePanel({
  kind,
  overlayImageUrl,
  levelNumber,
  bonusId,
  disabled,
  isPending,
  captureContext,
  cityStyle = true,
  canPaceTeam = false,
  leadLabel = "Team Lead",
  allowSkip = true,
  onSubmit,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const isVideo = kind === "video";
  const busy = disabled || isPending || sending;

  const attachStream = useCallback((stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    void video.play().then(
      () => setCameraReady(true),
      () => setCameraReady(true),
    );
  }, []);

  const stopStream = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setRecording(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Kamera nicht verfügbar. Datei aus der Galerie wählen.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: isVideo,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      attachStream(stream);
    } catch {
      setCameraError(
        "Kamera-Zugriff abgelehnt oder nicht möglich. Ihr könnt eine Datei wählen.",
      );
    }
  }, [attachStream, isVideo]);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }
    void startCamera();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [open, startCamera, stopStream]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function setPreview(blob: Blob) {
    setPreviewBlob(blob);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
    setPhase("preview");
    setUploadError(null);
  }

  async function snapshotPhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const overlay = overlayRef.current;
    if (kind === "augmented_photo" && overlay && overlay.naturalWidth > 0) {
      drawContain(
        ctx,
        overlay,
        overlay.naturalWidth,
        overlay.naturalHeight,
        canvas.width,
        canvas.height,
      );
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (blob) setPreview(blob);
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recorderRef.current = null;
    setRecording(false);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setCameraError("Video-Aufnahme in diesem Browser nicht möglich. Datei wählen.");
      return;
    }
    chunksRef.current = [];
    const mime = pickRecorderMime();
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size > 0) setPreview(blob);
    };
    try {
      recorder.start(250);
    } catch {
      try {
        recorder.start();
      } catch {
        setCameraError("Video-Aufnahme in diesem Browser nicht möglich. Datei wählen.");
        setRecording(false);
        return;
      }
    }
    setElapsed(0);
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      setElapsed((seconds) => {
        const next = seconds + 1;
        if (next >= EVENT_CAPTURE_VIDEO_MAX_SECONDS) {
          stopRecording();
          return EVENT_CAPTURE_VIDEO_MAX_SECONDS;
        }
        return next;
      });
    }, 1000);
  }

  function retake() {
    setPhase("live");
    setPreviewBlob(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setElapsed(0);
    setUploadError(null);
    requestAnimationFrame(() => {
      if (streamRef.current) {
        attachStream(streamRef.current);
      } else {
        void startCamera();
      }
    });
  }

  function closeCamera(force = false) {
    if (busy && !force) return;
    setOpen(false);
    setPhase("live");
    setPreviewBlob(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setUploadError(null);
    setCameraError(null);
    stopStream();
  }

  async function sendCapture() {
    if (!previewBlob || busy) return;
    if (!captureContext) {
      setUploadError("Session fehlt. Bitte Seite neu laden und nochmal senden.");
      return;
    }
    setSending(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      const mime = previewBlob.type || (isVideo ? "video/webm" : "image/jpeg");
      const file = new File(
        [previewBlob],
        `capture.${extensionForMime(mime, kind)}`,
        { type: mime },
      );
      formData.append("file", file);
      formData.append("inviteCode", captureContext.inviteCode);
      formData.append("joinCode", captureContext.joinCode);
      formData.append("sessionId", captureContext.sessionId);
      formData.append("levelNumber", String(levelNumber));
      formData.append("kind", kind);
      if (bonusId) formData.append("bonusId", bonusId);
      const result = await uploadEventCapture(formData);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      onSubmit({ answer: "ok" });
      closeCamera(true);
    } finally {
      setSending(false);
    }
  }

  async function handleSaveToDevice() {
    if (!previewBlob || saving) return;
    setSaving(true);
    try {
      const mime = previewBlob.type || (isVideo ? "video/webm" : "image/jpeg");
      await saveBlobToDevice(
        previewBlob,
        `grid-${kind}-${Date.now()}.${extensionForMime(mime, kind)}`,
      );
    } catch {
      /* share cancelled */
    } finally {
      setSaving(false);
    }
  }

  function handleFilePick(file: File | null) {
    if (!file) return;
    setOpen(true);
    if (isVideo && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (probe.duration > EVENT_CAPTURE_VIDEO_MAX_SECONDS + 0.4) {
          setUploadError(`Video darf höchstens ${EVENT_CAPTURE_VIDEO_MAX_SECONDS} Sekunden lang sein.`);
          return;
        }
        setPreview(file);
      };
      probe.onerror = () => {
        URL.revokeObjectURL(url);
        setPreview(file);
      };
      probe.src = url;
      return;
    }
    if (!isVideo && file.type.startsWith("image/")) {
      if (kind === "augmented_photo") {
        void compositeFileWithOverlay(file);
        return;
      }
      setPreview(file);
    }
  }

  async function compositeFileWithOverlay(file: File) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setPreview(file);
      return;
    }
    drawCover(ctx, bitmap, bitmap.width, bitmap.height, canvas.width, canvas.height);
    const overlay = overlayRef.current;
    if (overlay && overlay.naturalWidth > 0) {
      drawContain(
        ctx,
        overlay,
        overlay.naturalWidth,
        overlay.naturalHeight,
        canvas.width,
        canvas.height,
      );
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    setPreview(blob ?? file);
  }

  function skipTask() {
    if (busy) return;
    onSubmit({ revealSolution: true });
  }

  const shootLabel =
    kind === "video"
      ? "Video aufnehmen"
      : kind === "augmented_photo"
        ? "Foto mit Rahmen"
        : "Foto machen";
  const hint =
    kind === "video"
      ? `Maximal ${EVENT_CAPTURE_VIDEO_MAX_SECONDS} Sekunden. Danach senden — oder neu versuchen.`
      : kind === "augmented_photo"
        ? "Der Rahmen liegt über der Kamera. Foto machen, prüfen, dann senden."
        : "Foto machen, prüfen, bei Bedarf neu — dann senden.";

  function PrimaryButton({
    children,
    ...props
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) {
    return cityStyle ? (
      <BigButton {...props}>{children}</BigButton>
    ) : (
      <GridButton {...props}>{children}</GridButton>
    );
  }

  function SecondaryButton({
    children,
    ...props
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) {
    return cityStyle ? (
      <BigButton variant="outline" {...props}>
        {children}
      </BigButton>
    ) : (
      <GridButton variant="secondary" {...props}>
        {children}
      </GridButton>
    );
  }

  return (
    <div className="space-y-4">
      <p
        className={
          cityStyle
            ? "text-center text-sm text-[var(--cg-muted)]"
            : "text-sm text-slate-600"
        }
      >
        {hint}
      </p>

      <PrimaryButton disabled={disabled || isPending} onClick={() => setOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <Camera className="h-5 w-5" strokeWidth={2.4} />
          Kamera öffnen
        </span>
      </PrimaryButton>
      {cameraError ? (
        <>
          <p
            className={
              cityStyle
                ? "text-center text-sm text-[var(--cg-muted)]"
                : "text-sm text-slate-600"
            }
          >
            {cameraError}
          </p>
          <button
            type="button"
            disabled={disabled || isPending}
            onClick={() => fileRef.current?.click()}
            className={
              cityStyle
                ? "w-full text-center text-sm font-semibold text-[var(--cg-muted)] underline-offset-2 hover:underline disabled:opacity-40"
                : "w-full text-center text-sm text-slate-500 underline"
            }
          >
            Aus der Galerie
          </button>
        </>
      ) : null}

      {allowSkip ? (
        <button
          type="button"
          disabled={busy}
          onClick={skipTask}
          className={
            cityStyle
              ? "w-full pt-1 text-center text-sm font-semibold text-[var(--cg-muted)] disabled:opacity-40"
              : "w-full text-center text-sm text-slate-500"
          }
        >
          Überspringen · 0 Punkte
        </button>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        className="hidden"
        onChange={(event) => {
          handleFilePick(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {open ? (
        <div className="city-game fixed inset-0 z-[300] flex flex-col bg-black">
          <div className="relative min-h-0 flex-1 bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={`absolute inset-0 h-full w-full object-cover ${
                phase === "preview" ? "invisible" : "visible"
              }`}
            />
            {kind === "augmented_photo" && overlayImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={overlayRef}
                src={overlayImageUrl}
                alt=""
                className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
                  phase === "preview" ? "hidden" : ""
                }`}
              />
            ) : overlayImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={overlayRef} src={overlayImageUrl} alt="" className="hidden" />
            ) : null}
            {phase === "preview" && previewUrl ? (
              isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )
            ) : null}
            {recording ? (
              <div className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                ● {elapsed}s / {EVENT_CAPTURE_VIDEO_MAX_SECONDS}s
              </div>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => closeCamera()}
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-40"
              aria-label="Kamera schließen"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>

          <div className="space-y-3 bg-[var(--cg-bg)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            {cameraError ? (
              cityStyle ? (
                <p className="text-center text-sm text-[var(--cg-destructive)]">{cameraError}</p>
              ) : (
                <GridHint tone="warn">{cameraError}</GridHint>
              )
            ) : null}
            {uploadError ? (
              cityStyle ? (
                <p className="text-center text-sm text-[var(--cg-destructive)]">{uploadError}</p>
              ) : (
                <GridHint tone="warn">{uploadError}</GridHint>
              )
            ) : null}

            {phase === "preview" ? (
              <>
                <PrimaryButton disabled={busy || !previewBlob} onClick={() => void sendCapture()}>
                  {sending || isPending ? "Sende…" : "Senden"}
                </PrimaryButton>
                <SecondaryButton disabled={busy} onClick={retake}>
                  Neu versuchen
                </SecondaryButton>
                <button
                  type="button"
                  disabled={busy || !previewBlob || saving}
                  onClick={() => void handleSaveToDevice()}
                  className="w-full text-center text-sm font-semibold text-[var(--cg-muted)] disabled:opacity-40"
                >
                  {saving ? "Speichern…" : "Aufs Handy speichern"}
                </button>
              </>
            ) : (
              <>
                {isVideo ? (
                  <PrimaryButton
                    disabled={busy || (!cameraReady && !cameraError)}
                    onClick={() => (recording ? stopRecording() : startRecording())}
                  >
                    {recording ? "Aufnahme stoppen" : shootLabel}
                  </PrimaryButton>
                ) : (
                  <PrimaryButton disabled={busy || !cameraReady} onClick={() => void snapshotPhoto()}>
                    {shootLabel}
                  </PrimaryButton>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="w-full text-center text-sm font-semibold text-[var(--cg-muted)] disabled:opacity-40"
                >
                  Datei wählen
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
