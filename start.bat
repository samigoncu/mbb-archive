@echo off
REM MBB Kurumsal Arsiv - tek komutla gelistirme ortami (Windows).
REM Altyapi (Docker) + API + guvenlik tarama worker + web arayuzu.
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%CD%"

if not exist ".local-data\logs" mkdir ".local-data\logs"
if not exist ".local-data\staging" mkdir ".local-data\staging"
if not exist ".local-data\originals" mkdir ".local-data\originals"
if not exist ".local-data\artifacts" mkdir ".local-data\artifacts"

REM Yollar mutlak verilir: API ve worker farkli calisma dizinlerinden basliyor.
set "ASPNETCORE_ENVIRONMENT=Development"
set "Documents__FileStaging__RootPath=%ROOT%\.local-data\staging"
set "Documents__OriginalStorage__LocalRootPath=%ROOT%\.local-data\originals"
set "Search__Artifacts__LocalRootPath=%ROOT%\.local-data\artifacts"
set "SecurityScan__StagingRootPath=%ROOT%\.local-data\staging"
set "ConnectionStrings__Operations=Host=localhost;Port=5432;Database=mbb_archive;Username=mbb_archive;Password=change-me-local-only"

echo.
echo ==^> 1/5 Altyapi (PostgreSQL, RabbitMQ, OpenSearch, ClamAV)
docker compose -f deploy/compose.infrastructure.yml --env-file .env -p deploy up -d
if errorlevel 1 goto :fail

echo     PostgreSQL hazir olmasi bekleniyor...
for /l %%i in (1,1,40) do (
  for /f "delims=" %%s in ('docker inspect -f "{{.State.Health.Status}}" mbb-archive-postgres 2^>nul') do (
    if "%%s"=="healthy" goto :pgready
  )
  timeout /t 2 /nobreak >nul
)
:pgready

echo.
echo ==^> 2/5 Derleme
dotnet build Mbb.Archive.slnx -v quiet
if errorlevel 1 goto :fail

echo.
echo ==^> 3/5 Veritabani semasi
dotnet tool restore >nul
call :migrate AccessControl AccessDbContext
call :migrate Archive ArchiveDbContext
call :migrate Audit AuditDbContext
call :migrate Classification ClassificationDbContext
call :migrate Documents DocumentsDbContext
call :migrate Evidence EvidenceDbContext
call :migrate OfficialCorrespondence OfficialCorrespondenceDbContext
call :migrate Operations OperationsDbContext
call :migrate PhysicalArchive PhysicalArchiveDbContext
call :migrate Processing ProcessingDbContext
call :migrate Retention RetentionDbContext
call :migrate Search SearchDbContext
call :migrate Workflow WorkflowDbContext

echo.
echo ==^> 4/6 Dokuman workerlari (PDF metin cikarimi + OCR)
docker compose -f deploy/compose.workers.yml --env-file .env up -d --build

echo.
echo ==^> 5/6 Servisler
start "MBB API" cmd /c "dotnet run --project src/Host/Mbb.Archive.Api --no-build --urls http://localhost:5080 > .local-data\logs\api.log 2>&1"
start "MBB Security Scan" cmd /c "dotnet run --project src/Workers/Mbb.Archive.Worker.SecurityScan --no-build > .local-data\logs\security-scan.log 2>&1"

echo     API hazir olmasi bekleniyor...
for /l %%i in (1,1,40) do (
  curl -fsS -m 2 http://localhost:5080/health/ready >nul 2>&1 && goto :apiready
  timeout /t 2 /nobreak >nul
)
:apiready

echo.
echo ==^> 6/6 Web arayuzu
if not exist "web\node_modules" (
  echo     npm bagimliliklari kuruluyor...
  pushd web && call npm install && popd
)
start "MBB Web" cmd /c "cd web && npm run dev -- --port 3000 > ..\.local-data\logs\web.log 2>&1"

echo     Web hazir olmasi bekleniyor...
for /l %%i in (1,1,40) do (
  curl -fsS -m 3 http://localhost:3000 -o nul >nul 2>&1 && goto :webready
  timeout /t 2 /nobreak >nul
)
:webready

echo.
echo   ----------------------------------------------
echo    Arayuz     http://localhost:3000
echo    API        http://localhost:5080
echo    OpenAPI    http://localhost:5080/openapi/v1.json
echo    RabbitMQ   http://localhost:15672
echo    OpenSearch http://localhost:5601
echo.
echo    Loglar     .local-data\logs\
echo    Servisler ayri pencerelerde calisiyor.
echo   ----------------------------------------------
echo.
start "" http://localhost:3000
exit /b 0

:migrate
set "MODULE=%~1"
set "CONTEXT=%~2"
for /f "delims=" %%p in ('dir /b /s /ad "src\Modules\%MODULE%\*Migrations" 2^>nul') do set "MIGDIR=%%p"
if not defined MIGDIR exit /b 0
if not exist "!MIGDIR!\*.cs" (set "MIGDIR=" & exit /b 0)
call set "PROJ=%%MIGDIR:\Persistence\Migrations=%%"
dotnet ef database update --project "!PROJ!" --startup-project src/Host/Mbb.Archive.Api --context "%CONTEXT%" --no-build >nul 2>&1
if errorlevel 1 (echo     %MODULE% migration uygulanamadi) else (echo     %MODULE% OK)
set "MIGDIR="
exit /b 0

:fail
echo.
echo HATA: Onceki adim basarisiz oldu. Docker Desktop calisiyor mu?
pause
exit /b 1
