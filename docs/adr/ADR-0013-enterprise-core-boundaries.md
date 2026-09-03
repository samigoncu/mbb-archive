# ADR-0013 — Archive, Retention, Access, Audit and Workflow Boundaries
**Status:** Accepted

Archive record declaration, retention/legal hold, access policy, audit journal and workflow are separate bounded contexts. None may bypass another context's database ownership. Destruction is intentionally not automated in v1.0; eligibility and authorized disposition execution remain separate controls.
