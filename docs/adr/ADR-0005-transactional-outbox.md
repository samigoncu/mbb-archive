# ADR-0005 — Transactional Outbox

**Status:** Accepted

DB state ile integration event aynı transaction'da kalıcılaştırılır.

Queue publish ayrı background publisher tarafından yapılacaktır.
Distributed transaction kullanılmayacaktır.
