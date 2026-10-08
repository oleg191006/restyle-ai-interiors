import "server-only";
import { Client, Receiver } from "@upstash/qstash";
import { env } from "./env";

// QStash calls the worker endpoint over HTTP, retries on failure and caps parallelism
// (ADR 0005). Locally `pnpm qstash:dev` provides the same API.
export const workerPath = "/api/generations/run";

export async function enqueueGeneration(id: string) {
  const client = new Client({ baseUrl: env("QSTASH_URL"), token: env("QSTASH_TOKEN") });
  await client.publishJSON({
    url: new URL(workerPath, env("APP_URL")).toString(),
    body: { id },
    retries: 3,
    // Same id twice (double click, client retry) is published once.
    deduplicationId: id,
  });
}

/** Rejects requests that did not come from QStash: the worker spends the AI budget. */
export async function verifyQStash(request: Request, body: string) {
  const receiver = new Receiver({
    currentSigningKey: env("QSTASH_CURRENT_SIGNING_KEY"),
    nextSigningKey: env("QSTASH_NEXT_SIGNING_KEY"),
  });
  const signature = request.headers.get("upstash-signature") ?? "";
  try {
    return await receiver.verify({ signature, body, url: new URL(workerPath, env("APP_URL")).toString() });
  } catch {
    return false;
  }
}
