import { expect, it } from "vitest";
import { maxUploadBytes, uploadSizeError } from "./upload-size";
it("accepts the exact per-file limit and sequential files above the former total limit", () => {
  expect(uploadSizeError([{size:maxUploadBytes}, {size:maxUploadBytes}])).toBeNull();
});
it("uses the configured limit including its byte boundary", () => {
  const limit = 512 * 1024 * 1024;
  expect(uploadSizeError([{size:limit}], limit)).toBeNull();
  expect(uploadSizeError([{size:limit + 1}], limit)).toContain("512 MB");
});
