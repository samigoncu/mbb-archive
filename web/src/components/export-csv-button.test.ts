import { describe, it, expect } from "vitest";
import { csvCell } from "./export-csv-button";
describe("CSV output", () => {
  it("prevents spreadsheet formulas and preserves quoted text", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('Başlık; "belge"')).toBe('"Başlık; ""belge"""');
    expect(csvCell(null)).toBe('""');
  });
});
