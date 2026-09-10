"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { uploadEventCapture } from "@/app/actions/captures";
import { BigButton } from "@/components/game/city/ui";
import { GridButton, GridHint } from "@/components/grid/grid-shell";
import { TeamPaceHint } from "@/components/game/team-pace-hint";
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
  disabled: boolean;
  isPending: boolean;
  captureContext?: CaptureContext;
  cityStyle?: boolean;
  canPaceTeam?: boolean;
  leadLabel?: string;
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

export function MediaCapturePanel({
  kind,
  overlayImageUrl,
  levelNumber,
  disabled,
  isPending,
  captureContext,
  cityStyle = true,
  canPaceTeam = false,
  leadLabel = "Team Lead",
  onSubmit,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<Phase>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const isVideo = kind === "video";
  const busy = disabled || isPending || sending;

  const stopStream = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
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
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      await video.play();
      setCameraReady(true);
    } catch {
      setCameraError(
        "Kamera-Zugriff abgelehnt oder nicht möglich. Ihr könnt eine Datei wählen.",
      );
    }
  }, [isVideo]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [startCamera, stopStream]);

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
    if (!streamRef.current) void startCamera();
  }

  async function sendCapture() {
    if (!previewBlob || busy) return;
    setSending(true);
    setUploadError(null);
    try {
      if (captureContext) {
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
        const result = await uploadEventCapture(formData);
        if (!result.success) {
          setUploadError(result.error);
          return;
        }
      }
      onSubmit({ answer: "ok" });
    } finally {
      setSending(false);
    }
  }

  function handleFilePick(file: File | null) {
    if (!file) return;
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
    if (busy || !canPaceTeam) return;
    onSubmit({ revealSolution: true });
  }

  const title =
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

      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        {phase === "preview" && previewUrl ? (
          isVideo ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="h-full w-full object-cover"
            />
            {kind === "augmented_photo" && overlayImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={overlayRef}
                src={overlayImageUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            ) : overlayImageUrl ? (
              // preload overlay for file-fallback composite
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={overlayRef} src={overlayImageUrl} alt="" className="hidden" />
            ) : null}
            {recording ? (
              <div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                ● {elapsed}s / {EVENT_CAPTURE_VIDEO_MAX_SECONDS}s
              </div>
            ) : null}
          </>
        )}
      </div>

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
        <div className="space-y-2">
          <PrimaryButton disabled={busy || !previewBlob} onClick={() => void sendCapture()}>
            {sending || isPending ? "Sende…" : "Senden"}
          </PrimaryButton>
          <SecondaryButton disabled={busy} onClick={retake}>
            Neu versuchen
          </SecondaryButton>
        </div>
      ) : (
        <div className="space-y-2">
          {isVideo ? (
            <PrimaryButton
              disabled={busy || (!cameraReady && !cameraError)}
              onClick={() => (recording ? stopRecording() : startRecording())}
            >
              {recording ? "Aufnahme stoppen" : title}
            </PrimaryButton>
          ) : (
            <PrimaryButton disabled={busy || !cameraReady} onClick={() => void snapshotPhoto()}>
              {title}
            </PrimaryButton>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={
              cityStyle
                ? "w-full text-center text-sm font-semibold text-[var(--cg-muted)] underline-offset-2 hover:underline disabled:opacity-40"
                : "w-full text-center text-sm text-slate-500 underline"
            }
          >
            Datei wählen
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleFilePick(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {phase !== "preview" ? (
        canPaceTeam ? (
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
        ) : (
          <TeamPaceHint canPaceTeam={false} leadLabel={leadLabel} />
        )
      ) : null}
    </div>
  );
}
