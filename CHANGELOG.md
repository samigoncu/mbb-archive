# Changelog

## 1.4.0-operations-intelligence

- configurable alert rules, acknowledgement, escalation, deduplication and reopen lifecycle
- provider-independent notification channel port with email and HTTPS webhook adapters
- retry/backoff/dead-letter notification delivery state
- daily, weekly and monthly management-report contracts designed for background execution
- vendor-neutral SIEM export contracts with CEF/JSON Lines serialization and sensitive-data redaction
- rolling-average storage capacity snapshots and 30/90-day forecast
- SHA-256-bound immutable verification evidence package
- Operations alert endpoints protected with permission policies
- dedicated low-cardinality operations intelligence metrics
- CycloneDX NuGet/npm inventories plus Python, Docker and license inventories
- initial non-destructive Operations EF Core migration
- expanded responsive Operations Command Center loading, empty and error states

## 1.3.0-operations

### Operations Command Center
- new Operations bounded context
- aggregate bounded-context operational snapshots
- RabbitMQ Management API queue/DLQ probe
- OpenSearch cluster-health probe
- daily operational report
- verification-run persistence
- recovery-drill lifecycle with RPO/RTO evidence
- Next.js Operations Command Center page

### Integrity
- Documents original-object SHA-256 and size fixity sampling
- local and S3 object fixity verification
- full Audit hash-chain recomputation
- persisted verification outcomes

### Observability
- OpenTelemetry .NET 1.18.0
- ASP.NET Core, HTTP client and runtime instrumentation
- OTLP export boundary
- OpenTelemetry Collector deployment
- Prometheus 3.14.0
- Grafana OSS 13.2.1
- Tempo 3.0.2
- provisioned Prometheus/Tempo datasources
- version-controlled Operations dashboard
- integration-event publish metric
- operational backlog gauges

### DR
- backup manifest generation script
- SHA-256 backup-manifest verification
- restore-drill runbook
- explicit recovery evidence model

## 1.2.0-signature-eyp
- Evidence bounded context
- RFC 3161/CMS validation
- EYP 2.1 boundary
