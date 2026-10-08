export type RedesignInput = {
  /** JPEG, already resized in the browser to fit the model's < 512 px input limit */
  image: Buffer;
  prompt: string;
  /** style palette, used by the fake provider */
  palette: string[];
};

export type RedesignOutput = { image: Buffer; contentType: string };

export interface RedesignProvider {
  readonly name: string;
  redesign(input: RedesignInput): Promise<RedesignOutput>;
}

/**
 * Errors that will not go away on retry (rejected input, unknown room or style). Everything
 * else, including storage and network blips, is retried by QStash with backoff.
 */
export class PermanentError extends Error {}
