# ADR-0021 — OpenTelemetry Collector as Telemetry Boundary

**Status:** Accepted

Applications export OTLP.

```text
ASP.NET Core / workers
  ↓ OTLP
OpenTelemetry Collector
  ├── metrics → Prometheus
  └── traces  → Tempo
```

Applications do not directly depend on Prometheus/Grafana/Tempo APIs.

This keeps telemetry vendor-neutral at the application boundary.
