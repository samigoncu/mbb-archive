# EYP 2.1 Boundary

## Structural inspection

The platform can safely inspect an EYP/OPC package:

- package can be opened as OPC
- part count
- relationships
- content types
- per-part uncompressed size cap
- total uncompressed size cap

This protects ingestion from malformed/oversized package structures.

## Official validation

Structural inspection does **not** report official EYP compliance.

```text
IEyp21OfficialValidator
```

is the boundary for the official/current .NET EYP 2.1 API.

Until that adapter is connected:

```text
OfficialValidationStatus = NotConfigured
```

## Package construction

Creation/update is also disabled by default through:

```text
IEyp21PackageBuilder
```

When enabled, the implementation must preserve the original EYP and create an
update package where EYP 2.1 requires that behavior.
