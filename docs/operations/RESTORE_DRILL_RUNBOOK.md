# Restore Drill Runbook

A backup existing is not proof that it is restorable.

Minimum drill:

1. select an immutable backup reference,
2. verify the backup manifest SHA-256,
3. restore into an isolated/non-production PostgreSQL target,
4. apply no production writes,
5. run migration/schema checks,
6. run API smoke/read checks,
7. verify sample original-object fixity,
8. verify Audit hash chain,
9. measure actual RPO and RTO,
10. record evidence reference in `/api/v1/operations/recovery-drills`.

The application does not execute destructive restore commands automatically.
Production restore credentials must not be available to the normal API process.
