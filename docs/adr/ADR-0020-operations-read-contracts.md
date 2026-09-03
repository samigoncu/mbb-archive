# ADR-0020 — Operations Uses Module-Owned Read Contracts

**Status:** Accepted

Operations must not query another bounded context's internal database tables.

Each bounded context may implement:

```text
IOperationalSnapshotContributor
IIntegrityVerificationContributor
```

from the Observability building block.

This preserves database ownership while providing a consolidated command center.
