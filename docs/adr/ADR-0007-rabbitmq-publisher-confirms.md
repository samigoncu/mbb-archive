# ADR-0007 — RabbitMQ Publisher Confirms

**Status:** Accepted

## Decision

RabbitMQ integration event publisher:

- long-lived connection
- long-lived publisher channel
- publisher confirms
- persistent messages
- `mandatory=true`
- topic exchange

kullanır.

## Delivery semantics

Bu yapı **at-least-once delivery** sağlar.

Aşağıdaki yarış mümkündür:

1. broker mesajı kabul eder,
2. process çöker,
3. Outbox `processed_at` yazılamaz,
4. event tekrar publish edilir.

Bu nedenle consumer tarafında Inbox/idempotency zorunludur.
