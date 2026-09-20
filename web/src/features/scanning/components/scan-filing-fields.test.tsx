import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ScanFilingFields } from "./scan-filing-fields";
import { useScanContext } from "../model/use-scan-context";
import { context, unit } from "../model/scan-context.fixtures";
afterEach(cleanup);
function Form({ linked }: { linked: boolean }) {
  const initial = context();
  initial.folders[0] = { ...initial.folders[0], locationCode: "D02-R03", locationName: "Dolap 2 / Raf 3", ...(linked ? { digitalDossierId: initial.dossiers[0].id, filePlanCode: initial.dossiers[0].filePlanCode } : {}) };
  const scope = useScanContext(initial);
  return <ScanFilingFields units={[unit()]} scope={scope} disabled={false} onUnitChange={scope.changeUnit} />;
}
it("fiziksel klasörün konumunu dijital dosyalamadan ayrı gösterir", () => {
  render(<Form linked={false} />);
  fireEvent.change(screen.getByLabelText("Fiziksel klasör (varsa)"), { target: { value: "physical-bid" } });
  expect(screen.getByText("D02-R03 · Dolap 2 / Raf 3")).toBeTruthy();
  expect((screen.getByLabelText("Dijital dosya (SDP’ye göre)") as HTMLSelectElement).value).toBe("");
});
it("mevcut dijital dosya bağlantısını açıklarken fiziksel konumu korur", () => {
  render(<Form linked={true} />);
  fireEvent.change(screen.getByLabelText("Fiziksel klasör (varsa)"), { target: { value: "physical-bid" } });
  expect((screen.getByLabelText("Dijital dosya (SDP’ye göre)") as HTMLSelectElement).value).toBe("digital-bid");
  expect(screen.getByRole("status").textContent).toContain("otomatik seçildi");
  expect(screen.getByText("D02-R03 · Dolap 2 / Raf 3")).toBeTruthy();
});
