#!/usr/bin/env bash
# MBB Kurumsal Arşiv — tek komutla geliştirme ortamı.
# Altyapı (Docker) + API + güvenlik tarama + PDF/OCR worker'ları + web arayüzü.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LOGS="$ROOT/.local-data/logs"
mkdir -p "$LOGS" "$ROOT/.local-data/staging" "$ROOT/.local-data/originals" "$ROOT/.local-data/artifacts"

# Dosya yolları mutlak verilir: API ve worker farklı çalışma dizinlerinden
# başladığı için göreli yol ikisini ayrı klasörlere yazdırıyordu.
export ASPNETCORE_ENVIRONMENT=Development
export Documents__FileStaging__RootPath="$ROOT/.local-data/staging"
export Documents__OriginalStorage__LocalRootPath="$ROOT/.local-data/originals"
export Search__Artifacts__LocalRootPath="$ROOT/.local-data/artifacts"
export SecurityScan__StagingRootPath="$ROOT/.local-data/staging"

say() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m    %s\033[0m\n" "$1"; }

cleanup() {
  say "Kapatılıyor…"
  [[ -n "${WEB_PID:-}" ]] && kill "$WEB_PID" 2>/dev/null || true
  [[ -n "${SCAN_PID:-}" ]] && kill "$SCAN_PID" 2>/dev/null || true
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Docker konteynerleri çalışmaya devam ediyor. Durdurmak için:"
  echo "  docker compose -f deploy/compose.workers.yml down"
  echo "  docker compose -f deploy/compose.infrastructure.yml -p deploy down"
}
trap cleanup EXIT INT TERM

say "1/5 Altyapı (PostgreSQL, RabbitMQ, OpenSearch, ClamAV)"
docker compose -f deploy/compose.infrastructure.yml --env-file .env -p deploy up -d

printf "    PostgreSQL hazır olması bekleniyor"
for _ in $(seq 1 40); do
  if [[ "$(docker inspect -f '{{.State.Health.Status}}' mbb-archive-postgres 2>/dev/null)" == "healthy" ]]; then
    printf " ✓\n"; break
  fi
  printf "."; sleep 2
done

say "2/5 Derleme"
dotnet build Mbb.Archive.slnx -v quiet

say "3/5 Veritabanı şeması"
dotnet tool restore >/dev/null
for module in $(ls src/Modules); do
  migrations="$(find "src/Modules/$module" -type d -name Migrations 2>/dev/null | head -1)"
  [[ -z "$migrations" ]] && continue
  ls "$migrations"/*.cs >/dev/null 2>&1 || continue
  project="${migrations%/Persistence/Migrations}"
  case "$module" in AccessControl) context=AccessDbContext;; *) context="${module}DbContext";; esac
  ConnectionStrings__Operations="Host=localhost;Port=5432;Database=mbb_archive;Username=mbb_archive;Password=change-me-local-only" \
    dotnet ef database update --project "$project" --startup-project src/Host/Mbb.Archive.Api \
      --context "$context" --no-build >/dev/null 2>&1 \
    && printf "    %-24s ✓\n" "$module" \
    || warn "$module migration uygulanamadı"
done

say "4/6 Doküman worker'ları (PDF metin çıkarımı + OCR)"
docker compose -f deploy/compose.workers.yml --env-file .env up -d --build

say "5/6 Servisler"
dotnet run --project src/Host/Mbb.Archive.Api --no-build --urls http://localhost:5080 > "$LOGS/api.log" 2>&1 &
API_PID=$!
dotnet run --project src/Workers/Mbb.Archive.Worker.SecurityScan --no-build > "$LOGS/security-scan.log" 2>&1 &
SCAN_PID=$!

printf "    API hazır olması bekleniyor"
for _ in $(seq 1 40); do
  if curl -fsS -m 2 http://localhost:5080/health/ready >/dev/null 2>&1; then printf " ✓\n"; break; fi
  printf "."; sleep 2
done

say "6/6 Web arayüzü"
if [[ ! -d web/node_modules ]]; then
  echo "    npm bağımlılıkları kuruluyor…"
  (cd web && npm install)
fi
(cd web && npm run dev -- --port 3000) > "$LOGS/web.log" 2>&1 &
WEB_PID=$!

printf "    Web hazır olması bekleniyor"
for _ in $(seq 1 40); do
  if curl -fsS -m 3 http://localhost:3000 -o /dev/null 2>/dev/null; then printf " ✓\n"; break; fi
  printf "."; sleep 2
done

cat <<BANNER

  ────────────────────────────────────────────────
   Arayüz     http://localhost:3000
   API        http://localhost:5080
   OpenAPI    http://localhost:5080/openapi/v1.json
   RabbitMQ   http://localhost:15672   (mbb_archive / change-me-local-only)
   OpenSearch http://localhost:5601

   Worker'lar  docker logs -f mbb-archive-pdf-worker
               docker logs -f mbb-archive-ocr-worker

   Loglar     .local-data/logs/
   Durdurmak için Ctrl+C
  ────────────────────────────────────────────────

BANNER

wait
