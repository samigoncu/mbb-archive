# v1.0 Enterprise Core

```text
Documents → Archive Candidate → Record Declaration → Retention Case
                                      ↓                  ↓
                                   Audit             Legal Hold

JWT/OIDC → AccessControl RBAC → permission policies → API

Workflow Definitions → Instances → sequential approval/task core
```

## Archive
Original stored bytes automatically create an Archive Candidate. Formal declaration requires classification code + retention rule code and emits `archive.record-declared.v1`.

## Retention
Retention rules calculate due dates. Legal Hold blocks eligibility. Hourly evaluator only marks due, non-held cases eligible; actual destruction/transfer remains a separately controlled future action.

## Audit
Every RabbitMQ integration event is written to an append-only audit journal. Entries form a SHA-256 hash chain serialized under a PostgreSQL advisory transaction lock.

## Access Control
Production requires JWT/OIDC configuration. Dynamic policies use `permission:<permission-name>`. Development identity exists only while environment is Development and authentication is disabled.

## Workflow
v1.0 contains versioned definitions, ordered steps, publication, instances, and sequential step completion. BPMN conditions/timers/escalations are v1.1+.
