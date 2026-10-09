"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type Option = { slug: string; name: string };
type Phase = "idle" | "uploading" | "queued" | "running" | "done" | "error";

const MAX_SIDE = 504; // model input must be < 512 px; a multiple of 8 (ADR 0005)
const POLL_MS = 2000;
const POLL_LIMIT = 90; // 3 minutes

/**
 * Resize in the browser: the model needs < 512 px anyway, uploads shrink from megabytes to
 * kilobytes, and re-encoding through a canvas drops EXIF, including GPS coordinates.
 */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `http_${res.status}`);
  return json as T;
}

export function RedesignTool({
  locale,
  rooms,
  styles,
  t,
}: {
  locale: Locale;
  rooms: Option[];
  styles: Option[];
  t: Dictionary;
}) {
  const params = useSearchParams();
  const pick = (value: string | null, options: Option[]) =>
    options.some((o) => o.slug === value) ? value! : options[0]?.slug ?? "";

  const [room, setRoom] = useState(() => pick(params.get("room"), rooms));
  const [style, setStyle] = useState(() => pick(params.get("style"), styles));
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ before: string; after: string } | null>(null);
  const runId = useRef(0);

  const errorText = (code: string) =>
    code === "limit_visitor"
      ? t.toolErrorLimitVisitor
      : code === "limit_global"
        ? t.toolErrorLimitGlobal
        : code === "rate_limited"
          ? t.toolErrorRateLimited
          : t.toolErrorGeneric;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const blob = await prepare(file);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError(t.toolErrorImage);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return;
    const run = ++runId.current;
    setError(null);
    setResult(null);
    try {
      setPhase("uploading");
      const upload = await postJson<{ key: string; url: string }>("/api/uploads", {
        contentType: "image/jpeg",
        size: photo.blob.size,
      });
      const put = await fetch(upload.url, { method: "PUT", body: photo.blob, headers: { "Content-Type": "image/jpeg" } });
      if (!put.ok) throw new Error("upload_failed");

      setPhase("queued");
      const { id } = await postJson<{ id: string }>("/api/generations", { inputKey: upload.key, room, style, locale });

      for (let i = 0; i < POLL_LIMIT; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (run !== runId.current) return; // a newer submit took over
        const res = await fetch(`/api/generations/${id}`, { cache: "no-store" });
        const g = (await res.json()) as { status: string; error: string | null; inputUrl: string; outputUrl: string | null };
        if (g.status === "done" && g.outputUrl) {
          setResult({ before: g.inputUrl, after: g.outputUrl });
          setPhase("done");
          return;
        }
        if (g.status === "failed") throw new Error(g.error ?? "failed");
        setPhase(g.status === "running" ? "running" : "queued");
      }
      throw new Error("timeout");
    } catch (err) {
      if (run !== runId.current) return;
      setPhase("error");
      setError(errorText(err instanceof Error ? err.message : ""));
    }
  }

  const busy = phase === "uploading" || phase === "queued" || phase === "running";
  const status = { uploading: t.toolUploading, queued: t.toolQueued, running: t.toolRunning }[phase as string];

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-medium">{t.toolPhoto}</span>
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="rounded-xl border border-line p-3 file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-background"
          />
          <span className="text-sm text-muted">{t.toolPhotoHint}</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium">{t.toolRoom}</span>
          <select value={room} onChange={(e) => setRoom(e.target.value)} disabled={busy} className="rounded-xl border border-line bg-background p-3">
            {rooms.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium">{t.toolStyle}</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)} disabled={busy} className="rounded-xl border border-line bg-background p-3">
            {styles.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button
            type="submit"
            disabled={!photo || busy}
            className="rounded-full bg-accent px-6 py-3 font-medium text-background disabled:opacity-50"
          >
            {phase === "done" ? t.toolAgain : t.toolSubmit}
          </button>
          <p aria-live="polite" className="text-sm text-muted">
            {busy ? status : error}
          </p>
        </div>
        <p className="text-sm text-muted sm:col-span-2">{t.toolPrivacy}</p>
      </form>

      {/* Presigned storage URLs change per request and come from another host, so the
          Next.js image optimizer would only add a hop; plain img is the right tool here. */}
      {result ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.before} alt={t.toolBefore} className="w-full rounded-xl border border-line" />
            <figcaption className="text-sm text-muted">{t.toolBefore}</figcaption>
          </figure>
          <figure className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.after} alt={t.toolAfter} className="w-full rounded-xl border border-line" />
            <figcaption className="text-sm text-muted">{t.toolAfter}</figcaption>
          </figure>
        </div>
      ) : (
        photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.preview} alt={t.toolPhoto} className="max-h-80 rounded-xl border border-line" />
        )
      )}
    </div>
  );
}
