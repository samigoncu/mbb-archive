# Operations Command Center

## Sources

The command center aggregates bounded-context-owned operational snapshots.

```text
Documents ─┐
Processing ├─ IOperationalSnapshotContributor
Search ────┤
Workflow ──┤
Audit ─────┤
Evidence ──┤
Physical ──┘
             ↓
          Operations
             ↓
   API + OpenTelemetry gauges
```

Operations never joins internal tables from another bounded context.

## Verification

`IIntegrityVerificationContributor` currently includes:

- Documents original object SHA-256/size sample verification
- Audit append-only hash-chain verification

Results are persisted to:

```text
operations.verification_runs
```

## Recovery evidence

Recovery drills persist:

```text
backup reference
target environment
target RPO/RTO
actual RPO/RTO
evidence reference
pass/fail
```

The API records/controls the drill lifecycle but does not hold privileged production
restore credentials.
