import { describe, expect, it } from "vitest";
import { parseFeedback, ratingReasons } from "./feedback";

describe("parseFeedback", () => {
  it("accepts up without a reason and down with or without one", () => {
    expect(parseFeedback({ rating: "up" })).toEqual({ rating: "up", reason: null });
    expect(parseFeedback({ rating: "down" })).toEqual({ rating: "down", reason: null });
    expect(parseFeedback({ rating: "down", reason: "barely_changed" })).toEqual({ rating: "down", reason: "barely_changed" });
  });

  it("rejects a reason on up, unknown reasons and unknown ratings", () => {
    expect(parseFeedback({ rating: "up", reason: "poor_quality" })).toBeNull();
    expect(parseFeedback({ rating: "down", reason: "ugly" })).toBeNull();
    expect(parseFeedback({ rating: "down", reason: "toString" })).toBeNull();
    expect(parseFeedback({ rating: "meh" })).toBeNull();
    expect(parseFeedback(null)).toBeNull();
    expect(parseFeedback("up")).toBeNull();
  });

  it("lists every reason the database knows", () => {
    expect(ratingReasons).toEqual(["invented_architecture", "barely_changed", "wrong_style", "poor_quality"]);
  });
});
