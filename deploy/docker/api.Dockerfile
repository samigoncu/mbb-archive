FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .
RUN dotnet restore Mbb.Archive.slnx
RUN dotnet publish src/Host/Mbb.Archive.Api/Mbb.Archive.Api.csproj     --configuration Release     --output /app/publish     --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Mbb.Archive.Api.dll"]
