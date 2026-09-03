# Classification + Dynamic Metadata v0.8

```text
classification.file_plans
classification.file_plan_items
classification.metadata_schemas
classification.metadata_fields
classification.document_classifications
classification.document_metadata_sets
```

## File Plan

The platform can hold multiple versions simultaneously. SSDP V4 effective from 2024-01-02 can coexist with future revisions and institution-specific plans.

A document may have multiple classification entries; a grouping node marked `IsSelectable=false` cannot classify a document.

## Dynamic Metadata

Schemas are versioned:

```text
Draft -> Published -> Retired
```

Published schema is immutable. Fields support text, integer, decimal, boolean, date, datetime, choice, multichoice and JSON. Values are validated by the published schema and stored as JSONB with the schema id/version snapshot.

Examples:
- İmar: ada, parsel, mahalle, ruhsatNo
- Personel: sicilNo, belgeTürü
- Encümen: kararNo, kararTarihi, konu

Searchable dynamic fields will be projected to OpenSearch in v0.9.
