# MBB Kurumsal Belge, Arşiv ve Dijital Hafıza Platformu

**Version:** 1.4.0-operations-intelligence

v1.4 adds operations intelligence to the operational control plane.

## Operations Command Center

```text
Documents ─┐
Processing ├── module-owned snapshots
Search ────┤
Workflow ──┤
Audit ─────┤
Evidence ──┤
Physical ──┘
             ↓
          Operations
             ├── API
             ├── Reports
             ├── Integrity Verification
             └── DR Drill Evidence
```

Endpoints:

```text
GET  /api/v1/operations/overview
GET  /api/v1/operations/report/daily
GET  /api/v1/operations/verifications
POST /api/v1/operations/verifications/integrity

GET  /api/v1/operations/recovery-drills
POST /api/v1/operations/recovery-drills
POST /api/v1/operations/recovery-drills/{id}/start
POST /api/v1/operations/recovery-drills/{id}/complete
```

Web:

```text
/operations
```

## Observability

```text
MBB Archive
  ↓ OTLP
OpenTelemetry Collector
  ├── Prometheus
  │     ↓
  │   Grafana
  │
  └── Tempo
        ↓
      Grafana
```

Pinned development baseline:

```text
OpenTelemetry .NET      1.18.0
otelcol-contrib         0.159.0
Prometheus              3.14.0
Grafana OSS             13.2.1
Tempo                    3.0.2
```

Start observability:

```bash
docker compose   -f deploy/compose.observability.yml   --env-file .env   up -d
```

Local services:

```text
Grafana       http://localhost:3001
Prometheus    http://localhost:9090
Tempo         http://localhost:3200
OTLP gRPC     localhost:4317
OTLP HTTP     localhost:4318
```

## Integrity

Current verification contributors:

```text
documents.original_fixity
audit.hash_chain
```

Document fixity re-reads actual original bytes and recalculates SHA-256.
Audit verification recomputes the complete append-only hash chain.

## Disaster Recovery

The API deliberately does not perform privileged production restores.

Use:

```text
scripts/dr/create_backup_manifest.py
scripts/dr/verify_backup_manifest.py
docs/operations/RESTORE_DRILL_RUNBOOK.md
```

and record real drill RPO/RTO plus evidence in the Operations API.

## New database schema

```text
operations.verification_runs
operations.recovery_drills
```

## Kurulum ve çalıştırma

Gereksinimler: **Docker Desktop**, **.NET 10 SDK**, **Node.js** (En son sürüm / Latest).
Python worker'ları Docker içinde çalışır; yerel Python kurulumu gerekmez.

```bash
git clone <depo-adresi>
cd mbb-archive-v1.3-operations

cp .env.example .env
cp web/.env.example web/.env

./start.sh          # macOS / Linux
start.bat           # Windows
```

`start.sh` sırasıyla şunları yapar:

```text
1  Altyapı        PostgreSQL, RabbitMQ, OpenSearch, ClamAV
2  Derleme        dotnet build
3  Şema           13 modülün EF migration'ı
4  Worker'lar     PDF metin çıkarımı + OCR (Docker)
5  Servisler      API + güvenlik tarama worker'ı
6  Arayüz         Next.js
```

Açılan adresler:

```text
Arayüz      http://localhost:3000
API         http://localhost:5080
OpenAPI     http://localhost:5080/openapi/v1.json
RabbitMQ    http://localhost:15672
OpenSearch  http://localhost:5601
```

Durdurmak için `Ctrl+C`; Docker konteynerleri ayrıca kapatılır:

```bash
docker compose -f deploy/compose.workers.yml down
docker compose -f deploy/compose.infrastructure.yml -p deploy down
```

### Yerel veri

Yüklenen belgelerin orijinalleri, OCR çıktıları ve loglar `.local-data/`
altında tutulur ve depoya dahil edilmez. Sıfırdan başlamak için bu dizini ve
Docker volume'larını silmek yeterlidir.

## First VS Code compiler gate

```bash
dotnet restore Mbb.Archive.slnx
dotnet build Mbb.Archive.slnx
dotnet test Mbb.Archive.slnx

cd web
npm ci
npm run typecheck
npm run build

cd ..
python scripts/verify_architecture.py
```

The current ChatGPT execution environment does not include the .NET SDK. Static
repository validation is not a substitute for the real compiler gate.

## Operations intelligence

- configurable alert rules and auditable alert lifecycle
- provider-neutral email/webhook notification ports with retry delivery state
- background-report contracts for daily, weekly and monthly management reports
- CEF, JSON Lines and structured JSON SIEM boundary with data minimization
- rolling-average storage-capacity forecast
- SHA-256-bound verification evidence packages
- CycloneDX dependency inventories under `artifacts/sbom`
