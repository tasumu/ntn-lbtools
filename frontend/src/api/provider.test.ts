import { describe, expect, it } from "vitest";

import { shouldRetryQuery } from "./provider";

describe("shouldRetryQuery", () => {
  it("retries on 500 server error", () => {
    const error = { response: { status: 500 } };
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(true);
  });

  it("retries on 503 service unavailable", () => {
    const error = { response: { status: 503 } };
    expect(shouldRetryQuery(0, error)).toBe(true);
  });

  it("does NOT retry on 400 bad request", () => {
    const error = { response: { status: 400 } };
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it("does NOT retry on 404 not found", () => {
    const error = { response: { status: 404 } };
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it("does NOT retry on 422 validation error", () => {
    const error = { response: { status: 422 } };
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it("retries on network error (no response)", () => {
    const error = new Error("Network Error");
    expect(shouldRetryQuery(0, error)).toBe(true);
  });

  it("stops retrying after 3 attempts", () => {
    const error = { response: { status: 500 } };
    expect(shouldRetryQuery(3, error)).toBe(false);
  });
});
