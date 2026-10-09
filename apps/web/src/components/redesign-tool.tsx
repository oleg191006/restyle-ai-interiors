"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CompareSlider } from "@/components/compare-slider";
import { fetchAccount, usageText } from "@/lib/account-client";
import { fill, paths, type Dictionary, type Locale } from "@/lib/i18n";

type Option = { slug: string; name: string };
export type StyleOption = Option & { palette: string[]; examples: Record<string, string> };
type Phase = "idle" | "uploading" | "queued" | "running" | "done" | "error";
type Photo = { blob: Blob; preview: string; width: number; height: number };

const MAX_SIDE = 504; // model input must be < 512 px; a multiple of 8 (ADR 0005)
const POLL_MS = 2000;
const POLL_LIMIT = 90; // 3 minutes
const FIRST_STYLES = 6; // the rest behind "Show all": fifteen cards at once is a wall

/**
 * Resize in the browser: the model needs < 512 px anyway, uploads shrink from megabytes to
 * kilobytes, and re-encoding through a canvas drops EXIF, including GPS coordinates.
 */
async function prepare(file: File): Promise<Omit<Photo, "preview">> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9),
  );
  return { blob, width: canvas.width, height: canvas.height };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  // Limit errors carry the plan, so the message can offer the next step (sign in, upgrade).
  if (!res.ok) throw new Error([json.error ?? `http_${res.status}`, json.plan].filter(Boolean).join(":"));
  return json as T;
}

type ToolProps = { locale: Locale; rooms: Option[]; styles: StyleOption[]; t: Dictionary };

const pick = (value: string | null, options: Option[]) => (options.some((o) => o.slug === value) ? value! : (options[0]?.slug ?? ""));

const noSubscribe = () => () => {};

/**
 * Landing pages link here with ?room=&style= preselected. The page is prerendered, so the
 * server cannot know the query: the static HTML holds the whole form at its defaults, and the
 * browser re-renders only the selection once it reads the query. No Suspense fallback is swapped
 * out (that lost a photo picked in the first moments, and an empty fallback shifted the layout:
 * CLS 0.157). Until the person picks a room or style, the choice follows the query.
 */
export function RedesignTool({ locale, rooms, styles, t }: ToolProps) {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  const query = new URLSearchParams(search);
  const [roomChoice, setRoom] = useState<string | null>(null);
  const [styleChoice, setStyle] = useState<string | null>(null);
  const room = roomChoice ?? pick(query.get("room"), rooms);
  const style = styleChoice ?? pick(query.get("style"), styles);
  const [showAll, setShowAll] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ before: string; after: string } | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  // The next step offered after a limit error: sign in (guest) or upgrade (Free).
  const [nextStep, setNextStep] = useState<"signIn" | "upgrade" | null>(null);
  const runId = useRef(0);
  const stylesRef = useRef<HTMLFieldSetElement>(null);

  // Shows how many generations are left; the tool works without it.
  const loadQuota = () => fetchAccount().then(setQuota, () => {});
  useEffect(() => {
    fetchAccount().then(setQuota, () => {});
  }, []);

  const errorText = (code: string) =>
    code === "limit_plan:anonymous"
      ? t.toolErrorLimitAnonymous
      : code === "limit_plan:free"
        ? t.toolErrorLimitFree
        : code.startsWith("limit_plan")
          ? t.toolErrorLimitVisitor
          : code.startsWith("limit_global") // the plan is appended to every limit error
            ? t.toolErrorLimitGlobal
            : code === "rate_limited"
              ? t.toolErrorRateLimited
              : t.toolErrorGeneric;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setPhase("idle");
    try {
      const prepared = await prepare(file);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto({ ...prepared, preview: URL.createObjectURL(prepared.blob) });
    } catch {
      setError(t.toolErrorImage);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return;
    const run = ++runId.current;
    setError(null);
    setNextStep(null);
    setResult(null);
    try {
      setPhase("uploading");
      const upload = await postJson<{ key: string; url: string }>("/api/uploads", { contentType: "image/jpeg", size: photo.blob.size });
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
          loadQuota();
          return;
        }
        if (g.status === "failed") throw new Error(g.error ?? "failed");
        setPhase(g.status === "running" ? "running" : "queued");
      }
      throw new Error("timeout");
    } catch (err) {
      if (run !== runId.current) return;
      const code = err instanceof Error ? err.message : "";
      setPhase("error");
      setError(errorText(code));
      setNextStep(code === "limit_plan:anonymous" ? "signIn" : code === "limit_plan:free" ? "upgrade" : null);
    }
  }

  // Storage URLs are on another host, so `download` on a link is ignored; fetch the file instead.
  async function download() {
    if (!result) return;
    try {
      const blob = await (await fetch(result.after)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `restyle-${room}-${style}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(result.after, "_blank", "noopener");
    }
  }

  const busy = phase === "uploading" || phase === "queued" || phase === "running";
  const status = { uploading: t.toolUploading, queued: t.toolQueued, running: t.toolRunning }[phase as string];
  const styleName = styles.find((s) => s.slug === style)?.name ?? "";
  const visible = showAll ? styles : styles.filter((s, i) => i < FIRST_STYLES || s.slug === style);
  const progress = [
    { label: t.toolProgressUpload, done: phase !== "uploading", active: phase === "uploading" },
    { label: t.toolProgressQueue, done: phase === "running", active: phase === "queued" },
    { label: fill(t.toolProgressGenerate, { style: styleName }), done: false, active: phase === "running" },
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-12">
      <form onSubmit={onSubmit} className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">1 · {t.toolPhoto}</h2>
          <input
            id="tool-photo"
            type="file"
            accept="image/*"
            aria-label={t.toolPhoto}
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="peer sr-only"
          />
          {photo ? (
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, nothing to optimize */}
              <img src={photo.preview} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-muted">
                  {fill(t.toolPhotoReady, { width: photo.width, height: photo.height, kb: Math.round(photo.blob.size / 1024) })}
                </p>
              </div>
              <label htmlFor="tool-photo" className="cursor-pointer rounded-full px-4 py-3 font-semibold text-accent hover:bg-accent-soft">
                {t.toolReplace}
              </label>
            </div>
          ) : (
            <label
              htmlFor="tool-photo"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${
                dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft"
              }`}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-accent">
                <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="text-lg font-semibold">{t.toolDrop}</span>
              <span className="text-sm text-muted">{t.toolPhotoHint}</span>
            </label>
          )}
        </section>

        <fieldset className="space-y-3" disabled={busy}>
          <legend className="mb-3 text-sm font-semibold tracking-widest text-muted uppercase">2 · {t.toolRoom}</legend>
          <div className="flex flex-wrap gap-2">
            {rooms.map((r) => (
              <label key={r.slug} className="cursor-pointer">
                <input type="radio" name="room" value={r.slug} checked={room === r.slug} onChange={() => setRoom(r.slug)} className="peer sr-only" />
                <span className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-4 text-[15px] peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-foreground">
                  {r.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset ref={stylesRef} className="space-y-3" disabled={busy}>
          <legend className="mb-3 text-sm font-semibold tracking-widest text-muted uppercase">3 · {t.toolStyle}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((s) => {
              const image = s.examples[room] ?? Object.values(s.examples)[0];
              return (
                <label key={s.slug} className="cursor-pointer">
                  <input type="radio" name="style" value={s.slug} checked={style === s.slug} onChange={() => setStyle(s.slug)} className="peer sr-only" />
                  <span className="block rounded-xl bg-surface p-1.5 ring-1 ring-line peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:ring-line-strong">
                    <span className="block aspect-4/3 overflow-hidden rounded-lg bg-line">
                      {image ? (
                        <Image src={image} alt="" width={1024} height={768} sizes="(min-width: 1024px) 160px, (min-width: 640px) 30vw, 45vw" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center gap-1.5">
                          {s.palette.map((c) => (
                            <span key={c} className="size-5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="block px-1.5 pt-2 pb-1 text-[15px] font-semibold">{s.name}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {!showAll && styles.length > visible.length && (
            <button type="button" onClick={() => setShowAll(true)} className="min-h-11 font-semibold text-accent hover:underline">
              {fill(t.toolShowAllStyles, { count: styles.length })}
            </button>
          )}
        </fieldset>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="submit"
              disabled={!photo || busy}
              className="min-h-13 rounded-full bg-accent px-8 text-lg font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
            >
              {phase === "done" ? t.toolRegenerate : t.toolSubmit}
            </button>
            {quota && <span className="text-sm text-muted">{usageText(t, quota)}</span>}
          </div>
          <p aria-live="polite" className="text-sm text-muted">
            {busy ? status : error}{" "}
            {!busy && nextStep === "signIn" && (
              <Link href={`${paths.account(locale)}?next=${encodeURIComponent(paths.redesign(locale, room, style))}`} className="font-semibold text-accent hover:underline">
                {t.signIn}
              </Link>
            )}
            {!busy && nextStep === "upgrade" && (
              <Link href={paths.account(locale)} className="font-semibold text-accent hover:underline">
                {t.upgrade}
              </Link>
            )}
          </p>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-6">
        {/* Presigned storage URLs change per request and come from another host, so the
            Next.js image optimizer would only add a hop; plain img is the right tool here. */}
        {result ? (
          <>
            <CompareSlider
              label={t.compareLabel}
              beforeLabel={t.toolBefore}
              afterLabel={fill(t.afterIn, { style: styleName })}
              // eslint-disable-next-line @next/next/no-img-element
              before={<img src={result.before} alt={t.toolBefore} className="h-full w-full object-cover" />}
              // eslint-disable-next-line @next/next/no-img-element
              after={<img src={result.after} alt={t.toolAfter} className="h-full w-full object-cover" />}
            />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={download} className="min-h-11 rounded-full bg-foreground px-6 font-semibold text-background hover:opacity-90">
                {t.toolDownload}
              </button>
              <button
                type="button"
                onClick={() => stylesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="min-h-11 rounded-full border border-line-strong bg-surface px-6 font-semibold hover:border-foreground"
              >
                {t.toolAgain}
              </button>
            </div>
          </>
        ) : (
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-line bg-accent-soft">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.preview} alt="" className={`h-full w-full object-cover transition ${busy ? "brightness-90 saturate-50" : ""}`} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="font-display text-2xl font-semibold">{t.toolEmptyTitle}</p>
                <p className="max-w-sm text-muted">{t.toolEmptyText}</p>
              </div>
            )}
            {busy && (
              <ol className="absolute bottom-4 left-4 space-y-1.5 rounded-xl bg-surface/95 px-5 py-4 text-[15px] shadow-lg">
                {progress.map((p) => (
                  <li key={p.label} className={`flex items-center gap-2.5 ${p.active ? "font-semibold" : p.done ? "" : "text-muted"}`}>
                    {p.done ? (
                      <span aria-hidden className="text-[#2f6b4f]">✓</span>
                    ) : (
                      <span aria-hidden className={`inline-block size-2.5 rounded-full ${p.active ? "animate-pulse bg-accent" : "bg-line-strong"}`} />
                    )}
                    {p.label}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        <p className="text-sm text-muted">{t.toolPrivacy}</p>
      </aside>
    </div>
  );
}
