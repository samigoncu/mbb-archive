# ADR-0019 — EYP 2.1 Official API Boundary

**Status:** Accepted

The platform performs safe OPC structural inspection independently.

However:

```text
Valid OPC package != EYP 2.1 compliant package
```

Official EYP 2.1 validation, package creation and update-package operations remain
behind ports:

- `IEyp21OfficialValidator`
- `IEyp21PackageBuilder`

Production conformance is enabled only when the current official EYP 2.1 .NET API
adapter is connected and verified.

The original EYP package is preserved. Update packages must never silently replace
or mutate the original package.
