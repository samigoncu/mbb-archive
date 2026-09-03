# ADR-0012 — Versioned File Plans and Metadata Schemas

**Status:** Accepted

Official/institutional file plans are data, not hard-coded enums. Each plan keeps code, version, authority and effective dates. Published metadata schemas are immutable; changes create a new schema version.

This preserves historical meaning: a document classified under an older plan/schema can still be interpreted years later.
