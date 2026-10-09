import { useEffect, useRef, useState } from "react";
import { fetchAccount } from "@/lib/account-client";
import type { Dictionary, Locale } from "@/lib/i18n";
import { queueGeneration, uploadPhoto, waitForResult, type Result } from "./api";
import { errorMessage, nextStepFor, type NextStep } from "./errors";

export type Phase = "idle" | "uploading" | "queued" | "running" | "done" | "error";

/**
 * The state of one redesign run: phase for the progress steps, the result, the error with its
 * next step, and today's quota. A newer run cancels the polling of an older one.
 */
export function useGeneration(locale: Locale, t: Dictionary) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<NextStep>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const runId = useRef(0);

  // Shows how many generations are left; the tool works without it.
  const loadQuota = () => fetchAccount().then(setQuota, () => {});
  useEffect(() => {
    fetchAccount().then(setQuota, () => {});
  }, []);

  /** Back to a clean form, optionally with a message (an unreadable photo). */
  function reset(message: string | null = null) {
    setPhase("idle");
    setResult(null);
    setError(message);
    setNextStep(null);
  }

  async function generate(photo: Blob, room: string, style: string) {
    const run = ++runId.current;
    const cancelled = () => run !== runId.current;
    reset();
    try {
      setPhase("uploading");
      const inputKey = await uploadPhoto(photo);
      setPhase("queued");
      const id = await queueGeneration({ inputKey, room, style, locale });
      const done = await waitForResult(id, setPhase, cancelled);
      if (!done) return;
      setResult(done);
      setPhase("done");
      loadQuota();
    } catch (err) {
      if (cancelled()) return;
      const code = err instanceof Error ? err.message : "";
      setPhase("error");
      setError(errorMessage(code, t));
      setNextStep(nextStepFor(code));
    }
  }

  const busy = phase === "uploading" || phase === "queued" || phase === "running";
  return { phase, busy, result, error, nextStep, quota, generate, reset };
}
