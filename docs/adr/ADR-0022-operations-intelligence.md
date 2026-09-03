# ADR-0022 — Operations Intelligence Boundaries

**Status:** Accepted

Alert rules, alert instances, delivery audit, storage forecasts, report runs and
verification evidence are owned by the Operations bounded context. Rules consume
module-owned operational snapshots; they never query another context's tables.

Notification delivery uses `INotificationChannel`. Unconfigured providers fail
explicitly and no adapter reports fake success. Delivery is finite retry with
exponential backoff and a terminal dead-letter state.

Management reports consume read contracts in background work. SIEM export uses
`ISiemExporter`, excludes document/OCR content, and minimizes subject identifiers.
Verification evidence hashes a deterministic payload and remains ready for a later
timestamp or electronic-signature layer without claiming legal signature status.
