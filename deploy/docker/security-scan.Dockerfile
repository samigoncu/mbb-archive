FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore Mbb.Archive.slnx
RUN dotnet publish src/Workers/Mbb.Archive.Worker.SecurityScan/Mbb.Archive.Worker.SecurityScan.csproj     --configuration Release     --output /app/publish     --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Mbb.Archive.Worker.SecurityScan.dll"]
