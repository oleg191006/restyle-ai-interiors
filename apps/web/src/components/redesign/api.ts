import type { Feedback } from "@/lib/feedback";
import type { Locale } from "@/lib/i18n";

/** The three API steps of a redesign as seen from the browser (ADR 0005, steps 1–6). */

const POLL_MS = 2000;
const POLL_LIMIT = 90; // 3 minutes

export type Result = { id: string; before: string; after: string };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  // Limit errors carry the plan, so the message can offer the next step (sign in, upgrade).
  if (!res.ok) throw new Error([json.error ?? `http_${res.status}`, json.plan].filter(Boolean).join(":"));
  return json as T;
}

/** Ask for a presigned URL and PUT the photo straight to storage; returns its key. */
export async function uploadPhoto(blob: Blob) {
  const upload = await postJson<{ key: string; url: string }>("/api/uploads", { contentType: "image/jpeg", size: blob.size });
  const put = await fetch(upload.url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
  if (!put.ok) throw new Error("upload_failed");
  return upload.key;
}

export async function queueGeneration(input: { inputKey: string; room: string; style: string; locale: Locale }) {
  const { id } = await postJson<{ id: string }>("/api/generations", input);
  return id;
}

/**
 * Poll the job until it is done. `onStatus` reports queued/running for the progress steps;
 * returns null when `cancelled()` says a newer run took over.
 */
export async function waitForResult(id: string, onStatus: (s: "queued" | "running") => void, cancelled: () => boolean): Promise<Result | null> {
  for (let i = 0; i < POLL_LIMIT; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    if (cancelled()) return null;
    const res = await fetch(`/api/generations/${id}`, { cache: "no-store" });
    const g = (await res.json()) as { status: string; error: string | null; inputUrl: string; outputUrl: string | null };
    if (g.status === "done" && g.outputUrl) return { id, before: g.inputUrl, after: g.outputUrl };
    if (g.status === "failed") throw new Error(g.error ?? "failed");
    onStatus(g.status === "running" ? "running" : "queued");
  }
  throw new Error("timeout");
}

/** 👍 / 👎 on a finished job (ADR 0015). True when it was saved. */
export async function sendFeedback(id: string, feedback: Feedback) {
  const res = await fetch(`/api/generations/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedback),
  });
  return res.ok;
}
