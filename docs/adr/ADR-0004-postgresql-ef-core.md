# ADR-0004 — PostgreSQL + EF Core

**Status:** Accepted

## Decision

Ana transactional veri tabanı PostgreSQL'dir.
.NET persistence adapter'ı EF Core + Npgsql kullanır.

## Rules

- Bounded context başına schema ownership
- Command path'te aggregate repository
- Read path'te projection
- Binary dosya DB dışında
- Explicit concurrency token
- Controlled migrations
