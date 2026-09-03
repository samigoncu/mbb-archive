$ErrorActionPreference = "Stop"

Write-Host "== Architecture rules ==" -ForegroundColor Cyan
python scripts/verify_architecture.py

Write-Host "== Backend build ==" -ForegroundColor Cyan
dotnet build Mbb.Archive.slnx --configuration Release

Write-Host "== Backend tests ==" -ForegroundColor Cyan
dotnet test Mbb.Archive.slnx --configuration Release --no-build

Write-Host "== Frontend typecheck ==" -ForegroundColor Cyan
Push-Location web
try {
    npm run typecheck
    npm run build
}
finally {
    Pop-Location
}
