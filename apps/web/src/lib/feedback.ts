import type { Rating, RatingReason } from "@restyle/db";

/**
 * 👍 / 👎 on a finished redesign (ADR 0015). Shared by the browser and the API route; only
 * types come from the database package, so nothing server-side reaches the client bundle.
 */
export type { Rating, RatingReason };
export type Feedback = { rating: Rating; reason: RatingReason | null };

// A Record over the database enum: a reason added to or removed from the schema without
// updating this list is a type error.
const REASONS: Record<RatingReason, true> = {
  invented_architecture: true,
  barely_changed: true,
  wrong_style: true,
  poor_quality: true,
};
export const ratingReasons = Object.keys(REASONS) as RatingReason[];

// hasOwn, not `in`: "toString" is "in" every object.
const isReason = (value: unknown): value is RatingReason => typeof value === "string" && Object.hasOwn(REASONS, value);

/** The request body, or null when it is not a valid rating. A reason only goes with "down". */
export function parseFeedback(body: unknown): Feedback | null {
  if (typeof body !== "object" || body === null) return null;
  const { rating, reason = null } = body as { rating?: unknown; reason?: unknown };
  if (rating === "up") return reason === null ? { rating, reason: null } : null;
  if (rating === "down") return reason === null || isReason(reason) ? { rating, reason } : null;
  return null;
}
