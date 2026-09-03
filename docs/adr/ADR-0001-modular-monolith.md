# ADR-0001 — Modular Monolith ile Başlangıç

**Status:** Accepted

## Context
Platform çok sayıda iş alanına ve ağır belge işleme süreçlerine sahiptir.
İlk günden mikroservis, operasyonel karmaşıklığı gereksiz artıracaktır.

## Decision
HTTP/API iş alanları Modular Monolith içinde bounded context olarak tutulacaktır.
OCR/PDF/Preview/Indexer gibi kaynak yoğun işler ayrı worker process'leri olacaktır.

## Consequences
- Deployment başlangıçta basittir.
- Modül sınırları architecture test'leriyle korunmalıdır.
- İhtiyaç olduğunda bounded context servis olarak ayrılabilir.
