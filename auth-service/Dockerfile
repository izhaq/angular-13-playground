# syntax=docker/dockerfile:1

# Containerised auth-service. Build context is auth-service/:
#   docker build -t auth-service auth-service/

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /build

# Restore against the csproj alone first, so the (slow) restore layer stays
# cached until the dependency list itself changes.
COPY src/AuthService/AuthService.csproj src/AuthService/
RUN dotnet restore src/AuthService/AuthService.csproj

COPY src/ src/
RUN dotnet publish src/AuthService/AuthService.csproj \
    --configuration Release \
    --no-restore \
    --output /out

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .

# SQLite lives on a volume: the file carries the seeded users *and* the live
# session rows, so a container restart without it silently logs everyone out.
# Absolute path on purpose — Program.cs only rewrites relative DataSource
# values against the content root. Owned by 'app' because the service (below)
# no longer runs as root and must be able to create and write the database.
RUN mkdir -p /app/data && chown app:app /app/data
VOLUME ["/app/data"]
ENV ConnectionStrings__AuthDb="Data Source=/app/data/auth.db"

# The non-root user the .NET images ship since 8.0. Nothing here needs root:
# the port is unprivileged and the only writable path is the volume above.
USER app

EXPOSE 5001

# appsettings.json pins Urls to http://localhost:5001. Inside a container that
# binds the loopback interface only, so -p published ports reach nothing. The
# command line outranks every other config source, so this fixes the bind
# without editing the file the host-side `npm run auth-service` flow reads.
ENTRYPOINT ["dotnet", "AuthService.dll", "--urls", "http://+:5001"]
